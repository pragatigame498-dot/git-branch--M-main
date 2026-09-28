import os
import re
import sys
import time
import functools
import asyncio
from typing import Dict, List, Tuple, Optional, Set, Any
from dotenv import load_dotenv
import ollama
from create_db import get_global_vector_db
import database
from memory import extract_and_save_memories, get_memory_context
import config

# Enforce UTF-8 encoding on Windows stdout/stderr to prevent UnicodeEncodeError
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

def safe_print(text: str) -> None:
    """Print text safely on all OS terminals without encoding crashes."""
    try:
        print(text, flush=True)
    except UnicodeEncodeError:
        print(text.encode("ascii", errors="replace").decode("ascii"), flush=True)

load_dotenv()

# ==============================================================================
# FAST, ROBUST RAG PIPELINE WITH REAL-TIME STREAMING & GEMINI / OLLAMA LLM
# ==============================================================================

_GEMINI_CLIENT = None
try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key:
        from google import genai
        _GEMINI_CLIENT = genai.Client(api_key=api_key)
        safe_print("[INIT] Fast Cloud LLM Client (Google GenAI) Initialized Successfully!")
except Exception as e:
    safe_print(f"[WARNING] Cloud LLM init skipped: {e}")

RESPONSE_CACHE: Dict[str, Any] = {}
RETRIEVAL_CACHE: Dict[str, Tuple[List[str], List[str], List[Dict[str, Any]]]] = {}
CACHE_MAX_SIZE = 500

DISTANCE_THRESHOLD = 1.0

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
    "python": "python programming language syntax functions data types classes modules pip",
}

# Working, prioritized Gemini Models (Fast & Active)
GEMINI_MODELS = [
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-2.5-flash"
]

OLLAMA_FAST_OPTIONS = {
    "keep_alive": "24h",
    "num_ctx": 2048,
    "num_predict": 500,
    "num_thread": 4,  # Cap CPU threads to prevent system freezing/hanging
    "temperature": 0.2,
    "top_k": 10,
    "top_p": 0.8
}

def fix_typos(text: str) -> str:
    words = text.split()
    fixed = [TYPO_MAP.get(w.lower(), w) for w in words]
    return " ".join(fixed)

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
                    elif any(k in user_txt.lower() for k in ["python", "javascript", "variable", "function", "array", "promise"]):
                        last_topic = user_txt
        except Exception as e:
            safe_print(f"[HISTORY WARNING] Could not fetch chat messages: {e}")

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
    safe_print("[CACHE] RAG Caches cleared due to index update.")

def clean_and_rerank_chunks(
    results: List[Tuple[Any, float]], 
    query: str, 
    top_n: int = 4
) -> Tuple[List[str], List[str], List[Dict[str, Any]]]:
    if not results:
        return [], [], []

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

        metadata = getattr(doc, "metadata", {}) or {}
        scored_chunks.append((hybrid_score, text, metadata))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    top_items = scored_chunks[:top_n]
    top_chunks = [item[1] for item in top_items]

    sources_list = []
    seen_sources = set()
    for _, _, meta in top_items:
        src_path = meta.get("source", "")
        filename = os.path.basename(src_path) if src_path else "Uploaded Document.pdf"
        page = meta.get("page", 1)
        if isinstance(page, int):
            page += 1  # Convert 0-indexed PyPDF page to 1-indexed human page
        source_key = f"{filename}:p{page}"
        if source_key not in seen_sources:
            seen_sources.add(source_key)
            sources_list.append({"file": filename, "page": page})

    extracted_headings = []
    heading_pattern = r"(?:^|\n)(?:#+ |\d+\.\d+ |Question \d+:? |Q:? )([^\n]+)"
    for _, text, meta in scored_chunks:
        matches = re.findall(heading_pattern, text)
        for m in matches:
            clean_m = m.strip().rstrip(".:")
            if clean_m and len(clean_m) > 3 and clean_m not in extracted_headings:
                extracted_headings.append(clean_m)

    return top_chunks, extracted_headings[:4], sources_list

def get_retrieved_chunks(cleaned_question: str, top_n: Optional[int] = None) -> Tuple[List[str], List[str], List[Dict[str, Any]]]:
    if top_n is None:
        top_n = config.TOP_K

    if cleaned_question in RETRIEVAL_CACHE:
        return RETRIEVAL_CACHE[cleaned_question]
    
    db = get_global_vector_db()
    pass1_results = []
    try:
        pass1_results = db.similarity_search_with_score(cleaned_question, k=top_n)
    except Exception as e:
        safe_print(f"[PASS 1 ERROR] {e}")

    top_chunks, headings, sources = clean_and_rerank_chunks(pass1_results, cleaned_question, top_n=top_n)
    if not top_chunks:
        expanded_q = expand_query(cleaned_question)
        try:
            pass2_results = db.similarity_search_with_score(expanded_q, k=top_n)
            top_chunks, headings, sources = clean_and_rerank_chunks(pass2_results, expanded_q, top_n=top_n)
        except Exception as e:
            safe_print(f"[PASS 2 ERROR] {e}")

    if len(RETRIEVAL_CACHE) >= CACHE_MAX_SIZE:
        RETRIEVAL_CACHE.clear()

    RETRIEVAL_CACHE[cleaned_question] = (top_chunks, headings, sources)
    return top_chunks, headings, sources

def build_rag_prompt(question: str, top_chunks: List[str], user_id: str = "default_user") -> str:
    """Build a clean, robust RAG system prompt with retrieved context."""
    doc_context = "\n\n---\n\n".join(top_chunks) if top_chunks else ""
    if len(doc_context) > 3000:
        doc_context = doc_context[:3000] + "..."

    prompt = f"""You are a helpful, intelligent RAG AI assistant.

Provide a thorough, comprehensive, and well-structured answer to the user's question using the retrieved context when relevant.

Guidelines:
1. Use the provided context as your primary source of knowledge.
2. Structure your answer clearly with Markdown:
   - Use headings (`##` and `###`) for main concepts.
   - Use bullet points (`- `) for lists and key points.
   - Use bold (`**term**`) for important terms.
   - For code examples, use fenced code blocks with language identifiers (e.g. ```python or ```javascript).
3. Ensure the response is complete, clean, and directly answers the question.

CONTEXT:
{doc_context if doc_context else "No document context available."}

USER QUESTION:
{question}"""
    return prompt

def ask_rag(question: str, user_id: str = "default_user", chat_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Process user query through RAG pipeline with high-speed generation and detailed logs.
    """
    t_start = time.time()
    global _GEMINI_CLIENT

    safe_print(f"\n[CHAT] Question received: {question}")
    safe_print("[CHAT] Request started")

    if not question or not question.strip():
        return {
            "success": True,
            "answer": "Please enter a question.",
            "sources": [],
            "perf": {"total_s": 0.0}
        }

    normalized_q = question.strip().lower()

    # AI Memory extraction
    extracted_memories = extract_and_save_memories(question, user_id)
    if extracted_memories:
        if "Name" in extracted_memories:
            ans = f"Hello! Details saved. I will remember that your name is **{extracted_memories['Name']}**."
        else:
            facts_str = ", ".join([f"**{k}**: {v}" for k, v in extracted_memories.items()])
            ans = f"Got it! I have saved {facts_str} in my memory."
        return {"success": True, "answer": ans, "sources": [], "perf": {"total_s": round(time.time() - t_start, 4)}}

    is_name_q = any(p in normalized_q for p in [
        "what is my name", "what's my name", "what is your name", "what's your name",
        "who am i", "who i am", "who are you", "who r u", "tell me my name", "tell me your name"
    ])
    is_location_q = any(p in normalized_q for p in [
        "where do i live", "what is my city", "where am i from", "my location", "where i live"
    ])

    if is_name_q or is_location_q:
        all_memories = database.get_all_user_memories(user_id)
        if is_name_q:
            saved_name = all_memories.get("Name")
            if saved_name:
                return {"success": True, "answer": f"Your name is **{saved_name}**!", "sources": [], "perf": {"total_s": round(time.time() - t_start, 4)}}
            return {"success": True, "answer": "I am your **RAG AI Assistant**! What is your name?", "sources": [], "perf": {"total_s": round(time.time() - t_start, 4)}}
        if is_location_q:
            if "City" in all_memories:
                return {"success": True, "answer": f"You live in **{all_memories['City']}**.", "sources": [], "perf": {"total_s": round(time.time() - t_start, 4)}}
            return {"success": True, "answer": "I don't have your location saved yet. Where do you live?", "sources": [], "perf": {"total_s": round(time.time() - t_start, 4)}}

    clean_q = normalized_q.rstrip(".,! ")
    if clean_q in ["hi", "hello", "hey"]:
        return {"success": True, "answer": "Hello! How can I assist you today?", "sources": [], "perf": {"total_s": round(time.time() - t_start, 4)}}
    if clean_q in ["bye", "goodbye"]:
        return {"success": True, "answer": "Goodbye! Have a great day ahead!", "sources": [], "perf": {"total_s": round(time.time() - t_start, 4)}}

    resolved_search_query, history_str = resolve_followup_question(question, chat_id)
    cache_key = f"{user_id}:{resolved_search_query.strip().lower()}"
    if cache_key in RESPONSE_CACHE:
        cached_val = RESPONSE_CACHE[cache_key]
        if isinstance(cached_val, dict):
            return cached_val
        return {"success": True, "answer": str(cached_val), "sources": [], "perf": {"total_s": round(time.time() - t_start, 4)}}

    # 1. Query Embedding
    safe_print("[CHAT] Query embedding started")
    t_embed_start = time.time()
    cleaned_question = fix_typos(resolved_search_query)
    query_embed_time = round(time.time() - t_embed_start, 4)
    safe_print(f"[CHAT] Query embedding completed: {query_embed_time}s")

    # 2. Vector Retrieval
    safe_print("[CHAT] Retrieval started")
    t_retrieval_start = time.time()
    top_chunks, headings, sources_list = get_retrieved_chunks(cleaned_question, top_n=config.TOP_K)
    retrieval_time = round(time.time() - t_retrieval_start, 4)
    safe_print(f"[CHAT] Retrieval completed: {retrieval_time}s")
    safe_print(f"[CHAT] Retrieved chunks: {len(top_chunks)}")

    # 3. Prompt Construction
    prompt = build_rag_prompt(question, top_chunks, user_id)

    # 4. LLM Generation
    safe_print("[CHAT] LLM request started")
    answer = None
    t_llm_start = time.time()
    used_model = "None"

    if _GEMINI_CLIENT is not None:
        for model_name in GEMINI_MODELS:
            try:
                safe_print(f"[CHAT] Trying Gemini model: {model_name}")
                response = _GEMINI_CLIENT.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={"max_output_tokens": 2048, "temperature": 0.2}
                )
                if response and response.text:
                    answer = response.text.strip()
                    used_model = model_name
                    safe_print(f"[CHAT] LLM response started with {model_name}")
                    break
            except Exception as err:
                safe_print(f"[CLOUD LLM WARNING ({model_name})] {err}")

    # Fallback to Ollama if Cloud is unavailable
    if not answer:
        try:
            safe_print("[CHAT] Falling back to local Ollama LLM (gemma3:4b)...")
            response = ollama.chat(
                model="gemma3:4b",
                messages=[{"role": "user", "content": prompt}],
                options=OLLAMA_FAST_OPTIONS
            )
            answer = response["message"]["content"].strip()
            used_model = "gemma3:4b (Ollama)"
        except Exception as e:
            safe_print(f"[OLLAMA LLM ERROR] {e}")

    llm_time = round(time.time() - t_llm_start, 4)
    safe_print(f"[CHAT] LLM response completed: {llm_time}s")

    if not answer:
        answer = "I'm sorry, I could not generate an answer at this time. Please try again."
        sources_list = []

    # Attach Sources section if sources exist
    if sources_list and "Sources:" not in answer:
        source_lines = [f"📄 {s['file']} (Page {s['page']})" for s in sources_list]
        sources_md = "\n\n---\n**Sources:**\n" + "\n".join(source_lines)
        answer += sources_md

    total_time = round(time.time() - t_start, 4)
    safe_print(f"[CHAT] Response length: {len(answer)}")
    safe_print("[CHAT] Sending response to frontend")
    safe_print(f"[PERF] Query embedding: {query_embed_time}s | Retrieval: {retrieval_time}s | LLM: {llm_time}s | Total: {total_time}s")

    res_obj = {
        "success": True,
        "answer": answer,
        "sources": sources_list,
        "perf": {
            "query_embedding_s": query_embed_time,
            "retrieval_s": retrieval_time,
            "llm_s": llm_time,
            "total_s": total_time,
            "model": used_model
        }
    }

    if len(RESPONSE_CACHE) >= CACHE_MAX_SIZE:
        RESPONSE_CACHE.clear()

    RESPONSE_CACHE[cache_key] = res_obj
    return res_obj

async def ask_rag_stream(question: str, user_id: str = "default_user", chat_id: Optional[str] = None):
    """
    Async Generator for real-time token streaming with instant response delivery.
    """
    global _GEMINI_CLIENT
    safe_print(f"\n[CHAT] Question received (Stream): {question}")
    safe_print("[CHAT] Request started")

    if not question or not question.strip():
        yield "Please enter a question."
        return

    normalized_q = question.strip().lower()

    # AI Memory extraction
    extracted_memories = extract_and_save_memories(question, user_id)
    if extracted_memories:
        if "Name" in extracted_memories:
            yield f"Hello! Details saved. I will remember that your name is **{extracted_memories['Name']}**."
        else:
            yield "Got it! Saved to memory."
        return

    is_name_q = any(p in normalized_q for p in [
        "what is my name", "what's my name", "what is your name", "what's your name",
        "who am i", "who i am", "who are you", "who r u", "tell me my name", "tell me your name"
    ])
    is_location_q = any(p in normalized_q for p in [
        "where do i live", "what is my city", "where am i from", "my location", "where i live"
    ])

    if is_name_q or is_location_q:
        all_memories = database.get_all_user_memories(user_id)
        if is_name_q:
            saved_name = all_memories.get("Name")
            if saved_name:
                yield f"Your name is **{saved_name}**!"
                return
            yield "I am your **RAG AI Assistant**! What is your name?"
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
        cached_val = RESPONSE_CACHE[cache_key]
        if isinstance(cached_val, dict):
            yield cached_val.get("answer", "")
        else:
            yield str(cached_val)
        return

    # 1. Query Embedding & Retrieval in thread
    safe_print("[CHAT] Query embedding started")
    cleaned_question = fix_typos(resolved_search_query)
    safe_print("[CHAT] Retrieval started")
    top_chunks, headings, sources_list = await asyncio.to_thread(
        get_retrieved_chunks, cleaned_question, config.TOP_K
    )
    safe_print(f"[CHAT] Retrieval completed. Retrieved chunks: {len(top_chunks)}")

    # 2. Prompt Construction
    prompt = build_rag_prompt(question, top_chunks, user_id)

    streamed_tokens = []
    llm_start_time = time.time()
    safe_print("[CHAT] LLM request started (Streaming)")

    # 3. Stream from Cloud Gemini Client
    if _GEMINI_CLIENT is not None:
        for model_name in GEMINI_MODELS:
            try:
                safe_print(f"[CHAT] Attempting stream with model: {model_name}")
                
                # Use a queue to safely bridge synchronous SDK streaming iterator with async generator
                queue = asyncio.Queue()
                
                def sync_stream_worker():
                    try:
                        stream = _GEMINI_CLIENT.models.generate_content_stream(
                            model=model_name,
                            contents=prompt,
                            config={"max_output_tokens": 2048, "temperature": 0.2}
                        )
                        for chunk in stream:
                            if chunk and hasattr(chunk, 'text') and chunk.text:
                                queue.put_nowait(("token", chunk.text))
                        queue.put_nowait(("done", None))
                    except Exception as ex:
                        queue.put_nowait(("error", ex))

                # Start worker in background thread
                worker_task = asyncio.create_task(asyncio.to_thread(sync_stream_worker))
                
                first_token_logged = False
                while True:
                    # Timeout safeguard
                    if time.time() - llm_start_time > config.LLM_TIMEOUT_SECONDS:
                        safe_print("[LLM STREAM TIMEOUT] Max stream timeout reached.")
                        break
                    
                    try:
                        event_type, val = await asyncio.wait_for(queue.get(), timeout=1.0)
                    except asyncio.TimeoutError:
                        if worker_task.done():
                            break
                        continue

                    if event_type == "token":
                        if not first_token_logged:
                            safe_print(f"[CHAT] LLM response started (First token in {round(time.time() - llm_start_time, 3)}s)")
                            first_token_logged = True
                        streamed_tokens.append(val)
                        yield val
                    elif event_type == "done":
                        break
                    elif event_type == "error":
                        safe_print(f"[CLOUD STREAM ERROR ({model_name})] {val}")
                        break

                if streamed_tokens:
                    break
            except Exception as err:
                safe_print(f"[CLOUD STREAM EXCEPTION ({model_name})] {err}")

    # Fallback to Local Ollama Stream
    if not streamed_tokens:
        try:
            safe_print("[CHAT] Falling back to Ollama stream...")
            queue = asyncio.Queue()

            def ollama_stream_worker():
                try:
                    stream = ollama.chat(
                        model="gemma3:4b",
                        messages=[{"role": "user", "content": prompt}],
                        stream=True,
                        options=OLLAMA_FAST_OPTIONS
                    )
                    for chunk in stream:
                        tok = chunk.get("message", {}).get("content", "")
                        if tok:
                            queue.put_nowait(("token", tok))
                    queue.put_nowait(("done", None))
                except Exception as ex:
                    queue.put_nowait(("error", ex))

            worker_task = asyncio.create_task(asyncio.to_thread(ollama_stream_worker))
            while True:
                if time.time() - llm_start_time > config.LLM_TIMEOUT_SECONDS:
                    break
                try:
                    event_type, val = await asyncio.wait_for(queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    if worker_task.done():
                        break
                    continue

                if event_type == "token":
                    streamed_tokens.append(val)
                    yield val
                elif event_type == "done" or event_type == "error":
                    break
        except Exception as e:
            safe_print(f"[OLLAMA STREAM ERROR] {e}")

    full_response = "".join(streamed_tokens).strip()

    if not full_response:
        fallback_msg = "I'm sorry, I could not generate an answer at this time. Please try again."
        yield fallback_msg
        full_response = fallback_msg
    elif sources_list and "Sources:" not in full_response:
        source_lines = [f"📄 {s['file']} (Page {s['page']})" for s in sources_list]
        sources_md = "\n\n---\n**Sources:**\n" + "\n".join(source_lines)
        yield sources_md
        full_response += sources_md

    safe_print(f"[CHAT] LLM response completed. Total stream tokens length: {len(full_response)}")
    safe_print("[CHAT] Sending response to frontend")

    if len(RESPONSE_CACHE) >= CACHE_MAX_SIZE:
        RESPONSE_CACHE.clear()
    RESPONSE_CACHE[cache_key] = full_response