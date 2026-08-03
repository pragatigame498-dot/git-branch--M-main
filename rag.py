import os
import re
import functools
import asyncio
from typing import Dict, List, Tuple, Optional, Set, Any
from dotenv import load_dotenv
import ollama
from create_db import get_global_vector_db
import database
from memory import extract_and_save_memories, get_memory_context

load_dotenv()

# ==============================================================================
# DEDICATED JAVASCRIPT RAG AI ASSISTANT PIPELINE WITH HIGH-PERFORMANCE CACHING
# ==============================================================================

_GEMINI_CLIENT = None
try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key:
        from google import genai
        _GEMINI_CLIENT = genai.Client(api_key=api_key)
        print("[INIT] Fast Cloud LLM Client Initialized Successfully!")
except Exception as e:
    print(f"[WARNING] Cloud LLM init skipped: {e}")

RESPONSE_CACHE: Dict[str, str] = {}
RETRIEVAL_CACHE: Dict[str, Tuple[List[str], List[str]]] = {}
CACHE_MAX_SIZE = 500

DISTANCE_THRESHOLD = 1.0
FALLBACK_NO_JS_DATA = "I don't know based on the provided JavaScript document."
FALLBACK_NON_JS_TOPIC = "This chatbot only answers questions from the uploaded JavaScript document."

TYPO_MAP = {
    "profetional": "professional",
    "profesional": "professional",
    "sumury": "summary",
    "sumary": "summary",
    "experiance": "experience",
    "exprience": "experience",
    "edukation": "education",
    "projct": "project",
    "projcts": "projects",
    "variablke": "variable",
    "variabl": "variable",
    "varible": "variable",
}

EXPANSION_RULES = {
    "javascript variable": "javascript variables variable declaration var let const identifier variable names naming rules data types scope",
    "js variable": "javascript variables variable declaration var let const identifier variable names naming rules",
    "javascript": "javascript programming web development dom functions variables data types scope hoisting closures",
    "closure": "closure closures lexical scope inner outer function variable access scope chain",
    "hoisting": "hoisting var function declaration TDZ temporal dead zone default initializations",
    "promise": "promise promises async await then catch resolve reject asynchronous event loop",
    "prototype": "prototype prototypal inheritance object prototype chain __proto__",
}

NON_JS_TOPICS = [
    "python", "java", "c++", "c#", "html", "css", "sql", "react",
    "database", "networking", "machine learning", "ai", "operating system"
]

OLLAMA_FAST_OPTIONS = {
    "keep_alive": "1h",
    "num_ctx": 1500,
    "num_predict": 350,
    "num_thread": 8,
    "temperature": 0.2,
    "top_k": 10,
    "top_p": 0.8
}

def fix_typos(text: str) -> str:
    words = text.split()
    fixed = [TYPO_MAP.get(w.lower(), w) for w in words]
    return " ".join(fixed)

def is_non_js_topic_query(text: str) -> bool:
    text_lower = text.lower().strip()
    forbidden = ["python", "css", "html", "c++", "c#", "sql", "react", "database", "networking", "machine learning", "operating system"]
    
    for topic in forbidden:
        if re.search(r"\b" + re.escape(topic) + r"\b", text_lower):
            return True

    if re.search(r"\bjava\b", text_lower) and not re.search(r"\bjavascript\b", text_lower) and not re.search(r"\bjs\b", text_lower):
        return True

    return False

def resolve_followup_question(question: str, chat_id: Optional[str]) -> Tuple[str, str]:
    """
    Context-Aware Follow-up Resolution.
    Uses chat history to understand pronouns ('its', 'it') and short follow-ups.
    Returns (resolved_search_query, history_context_str).
    """
    history_lines = []
    last_topic = ""

    if chat_id:
        try:
            messages = database.get_chat_messages(chat_id)
            recent_msgs = messages[-6:] if len(messages) > 6 else messages
            for msg in recent_msgs:
                role = "User" if msg.get("sender") == "user" else "Assistant"
                content = msg.get("text", msg.get("content", "")).strip()
                content_disp = content[:150] + "..." if len(content) > 150 else content
                history_lines.append(f"{role}: {content_disp}")
                if msg.get("sender") == "user":
                    user_txt = content
                    if len(user_txt.split()) <= 6 and not any(w in user_txt.lower() for w in ["types", "syntax", "methods", "its", "it", "ok", "hi"]):
                        last_topic = user_txt
                    elif any(k in user_txt.lower() for k in ["javascript", "variable", "function", "array", "promise"]):
                        last_topic = user_txt
        except Exception as e:
            print(f"[HISTORY WARNING] Could not fetch chat messages: {e}")

    history_str = "\n".join(history_lines) if history_lines else "No previous history in this session."
    
    q_lower = question.lower().strip()
    words = q_lower.split()
    
    is_short_followup = (
        len(words) <= 4 or 
        any(w in q_lower for w in ["its", "it", "types", "syntax", "methods", "examples", "full form", "why", "how"])
    )

    resolved_q = question
    if is_short_followup and last_topic:
        clean_topic = last_topic.rstrip("?.,! ")
        if "javascript" not in clean_topic.lower() and "js" not in clean_topic.lower():
            clean_topic = f"JavaScript {clean_topic}"
        resolved_q = f"{clean_topic} {question}"

    return resolved_q, history_str

def expand_query(text: str) -> str:
    cleaned = fix_typos(text.lower().strip())
    fluff_patterns = [
        r"^what (?:is|are) ", r"^explain ", r"^tell me about ",
        r"^definition of ", r"^how to use ", r"^types of ",
        r"^advantages of ", r"^examples? of "
    ]
    core_term = cleaned
    for p in fluff_patterns:
        core_term = re.sub(p, "", core_term).strip()

    expanded_terms = []
    for k, v in EXPANSION_RULES.items():
        if k in cleaned or k in core_term:
            expanded_terms.append(v)

    if expanded_terms:
        full_expanded = f"{cleaned} {' '.join(expanded_terms)}"
    else:
        full_expanded = f"{cleaned} {core_term}"

    return full_expanded

def clear_rag_cache() -> None:
    global RESPONSE_CACHE, RETRIEVAL_CACHE
    RESPONSE_CACHE.clear()
    RETRIEVAL_CACHE.clear()
    print("[CACHE] RAG Caches cleared due to index update.")

def clean_and_rerank_chunks(
    results: List[Tuple[Any, float]], 
    query: str, 
    top_n: int = 3
) -> Tuple[List[str], List[str]]:
    if not results:
        return [], []

    query_words = set(re.findall(r"\w+", query.lower()))
    scored_chunks = []
    seen_texts = set()

    for doc, distance in results:
        if distance > DISTANCE_THRESHOLD:
            continue

        text = doc.page_content.strip()
        if not text:
            continue

        text_signature = text[:120].lower()
        if text_signature in seen_texts:
            continue
        seen_texts.add(text_signature)

        doc_words = set(re.findall(r"\w+", text.lower()))
        keyword_overlap = len(query_words.intersection(doc_words)) / max(len(query_words), 1)

        vector_score = 1.0 / (1.0 + distance)
        hybrid_score = (vector_score * 0.7) + (keyword_overlap * 0.3)

        scored_chunks.append((hybrid_score, text, doc.metadata))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    top_chunks = [item[1] for item in scored_chunks[:top_n]]

    extracted_headings = []
    heading_pattern = r"(?:^|\n)(?:#+ |\d+\.\d+ |Question \d+:? |Q:? )([^\n]+)"
    for _, text, meta in scored_chunks:
        matches = re.findall(heading_pattern, text)
        for m in matches:
            clean_m = m.strip().rstrip(".:")
            if clean_m and len(clean_m) > 3 and clean_m not in extracted_headings:
                extracted_headings.append(clean_m)

    return top_chunks, extracted_headings[:4]

def get_retrieved_chunks(cleaned_question: str, top_n: int = 3) -> Tuple[List[str], List[str]]:
    if cleaned_question in RETRIEVAL_CACHE:
        return RETRIEVAL_CACHE[cleaned_question]
    
    db = get_global_vector_db()
    pass1_results = []
    try:
        pass1_results = db.similarity_search_with_score(cleaned_question, k=4)
    except Exception as e:
        print(f"[PASS 1 ERROR] {e}")

    top_chunks, headings = clean_and_rerank_chunks(pass1_results, cleaned_question, top_n=top_n)
    if not top_chunks:
        expanded_q = expand_query(cleaned_question)
        try:
            pass2_results = db.similarity_search_with_score(expanded_q, k=4)
            top_chunks, headings = clean_and_rerank_chunks(pass2_results, expanded_q, top_n=top_n)
        except Exception as e:
            print(f"[PASS 2 ERROR] {e}")

    if len(RETRIEVAL_CACHE) >= CACHE_MAX_SIZE:
        RETRIEVAL_CACHE.clear()

    RETRIEVAL_CACHE[cleaned_question] = (top_chunks, headings)
    return top_chunks, headings

def ask_rag(question: str, user_id: str = "default_user", chat_id: Optional[str] = None) -> str:
    global _GEMINI_CLIENT
    normalized_q = question.strip().lower()

    if is_non_js_topic_query(question):
        return FALLBACK_NON_JS_TOPIC

    extracted_memories = extract_and_save_memories(question, user_id)
    if extracted_memories:
        if "Name" in extracted_memories:
            name = extracted_memories["Name"]
            return f"Hello! Details saved. I will remember that the name is **{name}**."
        else:
            facts_str = ", ".join([f"**{k}**: {v}" for k, v in extracted_memories.items()])
            return f"Got it! I have saved {facts_str} in my memory."

    is_name_q = any(p in normalized_q for p in [
        "what is my name", "what's my name", "what is your name", "what's your name",
        "what is your self name", "what is your self-name", "what's your self name",
        "who am i", "who i am", "who are you", "who r u", "tell me my name", "tell me your name",
        "do you know my name", "do you know your name", "what is name", "self name",
        "tuze nav", "tujhe nav", "tumche nav", "majhe nav", "majh nav", "nav kay"
    ]) or ("name" in normalized_q and any(w in normalized_q for w in ["what", "who", "tell", "know", "your", "my", "self"]))

    is_location_q = any(p in normalized_q for p in [
        "where do i live", "what is my city", "where am i from", "my location", "where i live"
    ])

    if is_name_q or is_location_q:
        all_memories = database.get_all_user_memories(user_id)
        if is_name_q:
            saved_name = all_memories.get("Name")
            if not saved_name and chat_id:
                try:
                    msgs = database.get_chat_messages(chat_id)
                    for m in msgs:
                        txt = m.get("text", "").lower()
                        if "name is" in txt:
                            for p in ["your name is", "my name is", "name is"]:
                                if p in txt:
                                    extracted = txt.split(p)[-1].strip().split(".")[0].split(",")[0].title()
                                    if extracted:
                                        saved_name = extracted
                                        database.save_user_memory("Name", saved_name, user_id)
                                        break
                        if saved_name:
                            break
                except Exception:
                    pass

            if saved_name:
                return f"My name is **{saved_name}**!"
            return "I am **ASA Bot**, your AI Assistant! What is your name?"
        if is_location_q:
            if "City" in all_memories:
                return f"You live in **{all_memories['City']}**."
            return "I don't have your location saved yet. Where do you live?"

    clean_q = normalized_q.rstrip(".,! ")
    if clean_q in ["ok", "okay", "k", "sure", "got it", "cool", "great", "alright"]:
        return "Great! How can I help you further?"
    if any(clean_q.startswith(p) for p in ["thanks", "thank you", "thx"]):
        return "You're welcome! Feel free to ask any more questions."
    if clean_q in ["hi", "hello", "hey"]:
        return "Hello! How can I assist you today?"
    if clean_q in ["bye", "goodbye"]:
        return "Goodbye! Have a great day ahead!"

    resolved_search_query, history_str = resolve_followup_question(question, chat_id)
    cache_key = f"{user_id}:{resolved_search_query.strip().lower()}"
    if cache_key in RESPONSE_CACHE:
        return RESPONSE_CACHE[cache_key]

    cleaned_question = fix_typos(resolved_search_query)
    top_chunks, headings = get_retrieved_chunks(cleaned_question, top_n=3)
    memory_ctx = get_memory_context(user_id)

    doc_context = "\n\n---\n\n".join(top_chunks) if top_chunks else "No specific document context found."
    if len(doc_context) > 1200:
        doc_context = doc_context[:1200] + "..."

    prompt = f"""You are a helpful and intelligent AI Assistant.

{memory_ctx}

RECENT CONVERSATION HISTORY:
{history_str}

DOCUMENT CONTEXT (from uploaded files):
{doc_context}

USER QUESTION: {question}

INSTRUCTIONS:
1. If the question asks about identity, user/bot names, or previous conversation history, use the RECENT CONVERSATION HISTORY and USER/AI MEMORY to answer directly.
2. If the question asks about technical subjects or document content, use the DOCUMENT CONTEXT.
3. Structure your response professionally in Markdown format."""

    answer = None
    if _GEMINI_CLIENT is not None:
        try:
            response = _GEMINI_CLIENT.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config={"max_output_tokens": 300, "temperature": 0.2}
            )
            if response and response.text:
                answer = response.text.strip()
        except Exception as err:
            if "429" in str(err) or "RESOURCE_EXHAUSTED" in str(err):
                _GEMINI_CLIENT = None
                print("[CLOUD LLM EXHAUSTED] Disabling Cloud API to ensure instant local response.")

    if not answer:
        try:
            response = ollama.chat(
                model="gemma3:4b",
                messages=[{"role": "user", "content": prompt}],
                options=OLLAMA_FAST_OPTIONS
            )
            answer = response["message"]["content"].strip()
        except Exception:
            pass

    if not answer and top_chunks:
        topic_title = headings[0] if headings else question.title()
        main_text = top_chunks[0]
        answer = f"# {topic_title}\n\n## Definition & Details\n{main_text}"

    if not answer:
        RESPONSE_CACHE[cache_key] = FALLBACK_NO_JS_DATA
        return FALLBACK_NO_JS_DATA

    if len(RESPONSE_CACHE) >= CACHE_MAX_SIZE:
        RESPONSE_CACHE.clear()

    RESPONSE_CACHE[cache_key] = answer
    return answer

async def ask_rag_stream(question: str, user_id: str = "default_user", chat_id: Optional[str] = None):
    """
    Async Generator for zero-delay token streaming.
    Utilizes Ollama model retention (keep_alive), reduced context, and instant yielding.
    """
    global _GEMINI_CLIENT
    if is_non_js_topic_query(question):
        yield FALLBACK_NON_JS_TOPIC
        return

    extracted_memories = extract_and_save_memories(question, user_id)
    if extracted_memories:
        if "Name" in extracted_memories:
            yield f"Hello! Details saved. I will remember that the name is **{extracted_memories['Name']}**."
        else:
            yield "Got it! Saved to memory."
        return

    normalized_q = question.strip().lower()

    is_name_q = any(p in normalized_q for p in [
        "what is my name", "what's my name", "what is your name", "what's your name",
        "what is your self name", "what is your self-name", "what's your self name",
        "who am i", "who i am", "who are you", "who r u", "tell me my name", "tell me your name",
        "do you know my name", "do you know your name", "what is name", "self name",
        "tuze nav", "tujhe nav", "tumche nav", "majhe nav", "majh nav", "nav kay"
    ]) or ("name" in normalized_q and any(w in normalized_q for w in ["what", "who", "tell", "know", "your", "my", "self"]))

    is_location_q = any(p in normalized_q for p in [
        "where do i live", "what is my city", "where am i from", "my location", "where i live"
    ])

    if is_name_q or is_location_q:
        all_memories = database.get_all_user_memories(user_id)
        if is_name_q:
            saved_name = all_memories.get("Name")
            if not saved_name and chat_id:
                try:
                    msgs = database.get_chat_messages(chat_id)
                    for m in msgs:
                        txt = m.get("text", "").lower()
                        if "name is" in txt:
                            for p in ["your name is", "my name is", "name is"]:
                                if p in txt:
                                    extracted = txt.split(p)[-1].strip().split(".")[0].split(",")[0].title()
                                    if extracted:
                                        saved_name = extracted
                                        database.save_user_memory("Name", saved_name, user_id)
                                        break
                        if saved_name:
                            break
                except Exception:
                    pass

            if saved_name:
                yield f"My name is **{saved_name}**!"
                return
            yield "I am **ASA Bot**, your AI Assistant! What is your name?"
            return
        if is_location_q:
            if "City" in all_memories:
                yield f"You live in **{all_memories['City']}**."
                return
            yield "I don't have your location saved yet. Where do you live?"
            return

    clean_q = normalized_q.rstrip(".,! ")
    intent_map = {
        "ok": "Great! How can I help you further?",
        "okay": "Great! How can I help you further?",
        "thanks": "You're welcome! Feel free to ask any more questions.",
        "thank you": "You're welcome! Feel free to ask any more questions.",
        "hi": "Hello! How can I assist you today?",
        "hello": "Hello! How can I assist you today?",
        "hey": "Hello! How can I assist you today?",
        "bye": "Goodbye! Have a great day ahead!"
    }
    if clean_q in intent_map:
        yield intent_map[clean_q]
        return

    resolved_search_query, history_str = resolve_followup_question(question, chat_id)
    cache_key = f"{user_id}:{resolved_search_query.strip().lower()}"

    if cache_key in RESPONSE_CACHE:
        yield RESPONSE_CACHE[cache_key]
        return

    cleaned_question = fix_typos(resolved_search_query)
    top_chunks, headings = get_retrieved_chunks(cleaned_question, top_n=3)
    memory_ctx = get_memory_context(user_id)

    doc_context = "\n\n---\n\n".join(top_chunks) if top_chunks else "No specific document context found."
    if len(doc_context) > 1200:
        doc_context = doc_context[:1200] + "..."

    prompt = f"""You are a helpful and intelligent AI Assistant.

{memory_ctx}

RECENT CONVERSATION HISTORY:
{history_str}

DOCUMENT CONTEXT (from uploaded files):
{doc_context}

USER QUESTION: {question}

INSTRUCTIONS:
1. If the question asks about identity, user/bot names, or previous conversation history, use the RECENT CONVERSATION HISTORY and USER/AI MEMORY to answer directly.
2. If the question asks about technical subjects or document content, use the DOCUMENT CONTEXT.
3. Structure your response professionally in Markdown format."""

    streamed_tokens = []

    # 1. Cloud Gemini Stream (Fast Cloud Generation)
    if _GEMINI_CLIENT is not None:
        try:
            response = _GEMINI_CLIENT.models.generate_content_stream(
                model="gemini-2.0-flash",
                contents=prompt,
                config={"max_output_tokens": 350, "temperature": 0.2}
            )
            for chunk in response:
                if chunk and hasattr(chunk, 'text') and chunk.text:
                    streamed_tokens.append(chunk.text)
                    yield chunk.text
        except Exception as err:
            print(f"[CLOUD STREAM ERROR] {err}")
            if "429" in str(err) or "RESOURCE_EXHAUSTED" in str(err):
                _GEMINI_CLIENT = None
                print("[CLOUD LLM EXHAUSTED] Disabling Cloud API to ensure instant local response.")

    # 2. Local Ollama Stream with Persistent Model Retention (keep_alive: 1h)
    if not streamed_tokens:
        try:
            stream = ollama.chat(
                model="gemma3:4b",
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                options=OLLAMA_FAST_OPTIONS
            )
            for chunk in stream:
                token = chunk.get("message", {}).get("content", "")
                if token:
                    streamed_tokens.append(token)
                    yield token
        except Exception as e:
            print(f"[OLLAMA STREAM ERROR] {e}")

    # 3. Fast Extractor Fallback (Direct Chunk Stream)
    if not streamed_tokens and top_chunks:
        topic_title = headings[0] if headings else question.title()
        main_text = top_chunks[0]
        fallback_markdown = f"# {topic_title}\n\n## Definition & Details\n{main_text}"
        
        words = fallback_markdown.split(" ")
        chunk_size = 4
        for i in range(0, len(words), chunk_size):
            chunk_str = " ".join(words[i:i+chunk_size]) + " "
            streamed_tokens.append(chunk_str)
            yield chunk_str

    full_response = "".join(streamed_tokens).strip()
    if full_response:
        if len(RESPONSE_CACHE) >= CACHE_MAX_SIZE:
            RESPONSE_CACHE.clear()
        RESPONSE_CACHE[cache_key] = full_response
    elif not streamed_tokens:
        yield FALLBACK_NO_JS_DATA