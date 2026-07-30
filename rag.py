import os
import re
import functools
from typing import Dict, List, Tuple, Optional, Set, Any
from dotenv import load_dotenv
import ollama
from create_db import get_global_vector_db
import database
from memory import extract_and_save_memories, get_memory_context

load_dotenv()

# ==============================================================================
# DEDICATED JAVASCRIPT RAG AI ASSISTANT PIPELINE WITH MULTI-TURN MEMORY
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
CACHE_MAX_SIZE = 200

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
    Priority 2: Context-Aware Follow-up Resolution.
    Uses chat history to understand pronouns ('its', 'it') and short follow-ups
    ('types', 'syntax', 'methods', 'examples', 'full form').
    Returns (resolved_search_query, history_context_str).
    """
    history_lines = []
    last_topic = ""

    if chat_id:
        try:
            messages = database.get_chat_messages(chat_id)
            # Take last 6 messages
            recent_msgs = messages[-6:] if len(messages) > 6 else messages
            for msg in recent_msgs:
                role = "User" if msg.get("sender") == "user" else "Assistant"
                content = msg.get("content", "").strip()
                # Truncate long assistant messages
                if len(content) > 120:
                    content_disp = content[:120] + "..."
                else:
                    content_disp = content
                history_lines.append(f"{role}: {content_disp}")
                if msg.get("sender") == "user":
                    user_txt = msg.get("content", "").strip()
                    if len(user_txt.split()) <= 6 and not any(w in user_txt.lower() for w in ["types", "syntax", "methods", "its", "it", "ok", "hi"]):
                        last_topic = user_txt
                    elif "javascript" in user_txt.lower() or "variable" in user_txt.lower() or "function" in user_txt.lower() or "array" in user_txt.lower():
                        last_topic = user_txt
        except Exception as e:
            print(f"[HISTORY WARNING] Could not fetch chat messages: {e}")

    history_str = "\n".join(history_lines) if history_lines else "No previous conversation history."
    
    # Check if current question is a follow-up
    q_lower = question.lower().strip()
    words = q_lower.split()
    
    is_short_followup = (
        len(words) <= 4 or 
        any(w in q_lower for w in ["its", "it", "types", "syntax", "methods", "examples", "full form", "why", "how"])
    )

    resolved_q = question
    if is_short_followup and last_topic:
        # Clean last topic from question marks
        clean_topic = last_topic.rstrip("?.,! ")
        if "javascript" not in clean_topic.lower() and "js" not in clean_topic.lower():
            clean_topic = f"JavaScript {clean_topic}"
        resolved_q = f"{clean_topic} {question}"
        print(f"[RESOLVED FOLLOW-UP] Question '{question}' resolved to: '{resolved_q}' using topic: '{clean_topic}'")

    return resolved_q, history_str

def expand_query(text: str) -> str:
    cleaned = fix_typos(text.lower().strip())
    
    fluff_patterns = [
        r"^what (?:is|are) ",
        r"^explain ",
        r"^tell me about ",
        r"^definition of ",
        r"^how to use ",
        r"^types of ",
        r"^advantages of ",
        r"^examples? of "
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
    global RESPONSE_CACHE
    RESPONSE_CACHE.clear()
    print("[CACHE] RAG Response Cache cleared due to index update.")

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

        text_signature = text[:150].lower()
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

    return top_chunks, extracted_headings[:5]

def ask_rag(question: str, user_id: str = "default_user", chat_id: Optional[str] = None) -> str:
    """
    INTELLIGENT JAVASCRIPT RAG AI ASSISTANT WITH MULTI-TURN CONVERSATION MEMORY:
    - Resolves pronouns ('its') and follow-ups ('Types?', 'Syntax', 'Methods') from chat history.
    - Formats output cleanly with # Topic, ## Definition, ## Explanation, ## Types, ## Features, ## Syntax.
    """
    normalized_q = question.strip().lower()

    # Rule 8 & 13: Non-JS Topic Filter
    if is_non_js_topic_query(question):
        return FALLBACK_NON_JS_TOPIC

    # Step 1: Extract & Save Memories
    extracted_memories = extract_and_save_memories(question, user_id)
    memory_context = get_memory_context(user_id)

    if extracted_memories:
        if "Name" in extracted_memories:
            name = extracted_memories["Name"]
            return f"Hello **{name}**! Nice to meet you. I have saved your details in my memory."
        else:
            facts_str = ", ".join([f"**{k}**: {v}" for k, v in extracted_memories.items()])
            return f"Got it! I have saved {facts_str} in my memory. I will remember this across our conversations."

    # Step 2: Handle Personal Memory Questions
    is_name_q = any(p in normalized_q for p in [
        "what is my name", "what's my name", "what is your name", "what's your name",
        "who am i", "who i am", "tell me my name", "do you know my name"
    ]) or (normalized_q in ["my name", "your name"])

    is_location_q = any(p in normalized_q for p in [
        "where do i live", "what is my city", "where am i from", "my location", "where i live"
    ])

    is_general_mem_q = any(p in normalized_q for p in [
        "what do you know about me", "my profile", "my details", "my memories"
    ])

    if is_name_q or is_location_q or is_general_mem_q:
        all_memories = database.get_all_user_memories(user_id)

        if is_name_q:
            if "Name" in all_memories:
                return f"Your name is **{all_memories['Name']}**!"
            else:
                return "I am **ASA Bot**, your JavaScript AI Assistant! You haven't told me your name yet. What is your name?"

        if is_location_q:
            if "City" in all_memories:
                return f"You live in **{all_memories['City']}**."
            else:
                return "I don't have your location saved yet. Please tell me where you live!"

        if all_memories:
            memory_list = "\n".join([f"* **{k}**: {v}" for k, v in all_memories.items()])
            return f"Here is what I remember about you:\n\n{memory_list}"
        else:
            return "I am **ASA Bot**, your JavaScript AI Assistant!"

    # Step 2.5: Conversational Intents
    clean_q = normalized_q.rstrip(".,! ")

    if clean_q in ["ok", "okay", "k", "sure", "got it", "cool", "great", "awesome", "alright", "fine", "ok thanks", "ok thank you"]:
        return "Great! How can I help you further with your JavaScript document?"

    if any(clean_q.startswith(p) or clean_q == p for p in ["thanks", "thank you", "thx", "thank u", "dhanyawad", "thank you so much"]):
        return "You're welcome! Feel free to ask any more JavaScript questions whenever you need help."

    if clean_q in ["hi", "hello", "hey", "good morning", "good evening", "good afternoon", "namaskar", "namaste", "hi there", "hello bot"]:
        return "Hello! How can I assist you with your JavaScript document today?"

    if clean_q in ["bye", "goodbye", "see you", "good night", "ta ta"]:
        return "Goodbye! Have a great day ahead!"

    # --------------------------------------------------------------------------
    # STEP 3: CONTEXT-AWARE FOLLOW-UP RESOLUTION USING CHAT HISTORY
    # --------------------------------------------------------------------------
    resolved_search_query, history_str = resolve_followup_question(question, chat_id)

    # In-memory cache check (key includes resolved search query for consistency)
    cache_key = f"{user_id}:{resolved_search_query.strip().lower()}"
    if cache_key in RESPONSE_CACHE:
        print(f"[CACHE HIT] Instant response for: '{question}'")
        return RESPONSE_CACHE[cache_key]

    # --------------------------------------------------------------------------
    # STEP 4: PASS 1 & PASS 2 VECTOR DB RETRIEVAL
    # --------------------------------------------------------------------------
    db = get_global_vector_db()
    cleaned_question = fix_typos(resolved_search_query)

    pass1_results = []
    try:
        pass1_results = db.similarity_search_with_score(cleaned_question, k=8)
    except Exception as e:
        print(f"[PASS 1 ERROR] Vector search failed: {e}")

    top_chunks, headings = clean_and_rerank_chunks(pass1_results, cleaned_question, top_n=3)

    if not top_chunks:
        expanded_q = expand_query(cleaned_question)
        print(f"[PASS 2 FALLBACK] Searching with expanded query: '{expanded_q}'")
        try:
            pass2_results = db.similarity_search_with_score(expanded_q, k=8)
            top_chunks, headings = clean_and_rerank_chunks(pass2_results, expanded_q, top_n=3)
        except Exception as e:
            print(f"[PASS 2 ERROR] Expanded search failed: {e}")

    if not top_chunks:
        print(f"[OUT OF BOUNDS] Both Pass 1 and Pass 2 searches failed for: '{question}'")
        RESPONSE_CACHE[cache_key] = FALLBACK_NO_JS_DATA
        return FALLBACK_NO_JS_DATA

    doc_context = "\n\n---\n\n".join(top_chunks)
    if len(doc_context) > 2000:
        doc_context = doc_context[:2000] + "..."

    # --------------------------------------------------------------------------
    # STEP 5: STRUCTURED SYSTEM PROMPT FOR GENERATION
    # --------------------------------------------------------------------------
    prompt = f"""You are an Intelligent JavaScript RAG AI Assistant with Conversation Memory.

========================
PRIORITY & RULES
========================
1. Priority 1: Current question.
2. Priority 2: Use conversation history to resolve pronouns ("its", "it") and short follow-ups ("Types?", "Syntax", "Methods").
3. Priority 3: Source of truth is the uploaded JavaScript document context.
4. If the answer cannot be found in the document, reply EXACTLY:
I don't know based on the provided JavaScript document.

========================
OUTPUT FORMAT (If answer exists in context)
========================
# [Topic Name]

## Definition
...

## Explanation
...

## Types (if available in document)
...

## Features (if available in document)
...

## Syntax (if available in document)
```javascript
...
```

Highlight key terms using **bold**. Never answer in one line for valid topics.

========================
PREVIOUS CONVERSATION HISTORY
========================
{history_str}

========================
DOCUMENT CONTEXT
========================
{doc_context}

========================
CURRENT USER QUESTION
========================
{question}

========================
ANSWER
========================
"""

    answer = None

    # --------------------------------------------------------------------------
    # STEP 6: FAST LLM GENERATION (GEMINI / LOCAL OLLAMA)
    # --------------------------------------------------------------------------
    if _GEMINI_CLIENT is not None:
        for cloud_model in ["gemini-2.0-flash", "gemini-2.0-flash-lite"]:
            try:
                print(f"[CLOUD LLM] Generating structured answer using ({cloud_model})...")
                response = _GEMINI_CLIENT.models.generate_content(
                    model=cloud_model,
                    contents=prompt,
                    config={
                        "max_output_tokens": 300,
                        "temperature": 0.2,
                    }
                )
                if response and response.text:
                    answer = response.text.strip()
                    break
            except Exception as err:
                print(f"[CLOUD LLM FALLBACK] {cloud_model} error: {err}")

    if not answer:
        try:
            print("[LOCAL OLLAMA] Generating fast structured answer using Local Model...")
            fast_context = doc_context[:900] + "..." if len(doc_context) > 900 else doc_context
            fast_prompt = f"""Answer ONLY using provided context.
CONTEXT:
{fast_context}

QUESTION:
{question}

ANSWER IN MARKDOWN WITH HEADINGS (# Topic, ## Definition, ## Explanation):"""
            response = ollama.chat(
                model="gemma3:4b",
                messages=[{"role": "user", "content": fast_prompt}],
                options={
                    "num_predict": 100,
                    "num_ctx": 384,
                    "num_thread": 8,
                    "temperature": 0.1,
                    "top_k": 10,
                    "top_p": 0.8
                }
            )
            answer = response["message"]["content"].strip()
        except Exception as e:
            print(f"[LLM ERROR] Ollama chat call failed: {e}")
            answer = FALLBACK_NO_JS_DATA

    if not answer or "don't know based on the provided" in answer.lower() or "only answers questions from the uploaded javascript" in answer.lower():
        RESPONSE_CACHE[cache_key] = FALLBACK_NO_JS_DATA
        return FALLBACK_NO_JS_DATA

    if headings and len(headings) >= 2:
        related_block = "\n\n---\n### 📌 Related Topics\n" + "\n".join([f"* **{h}**" for h in headings[:4]])
        if "### 📌 Related Topics" not in answer:
            answer += related_block

    RESPONSE_CACHE[cache_key] = answer
    return answer