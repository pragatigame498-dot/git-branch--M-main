import os
import glob
import asyncio
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.document_loaders import PyPDFLoader

import database
import memory
from rag import ask_rag, ask_rag_stream, clear_rag_cache
from create_db import (
    build_vector_db,
    index_single_pdf,
    load_pdf_index_metadata,
    save_pdf_index_metadata,
    get_global_vector_db,
    get_global_embeddings
)

# ==============================================================================
# FASTAPI BACKEND WITH PERSISTENT CHAT HISTORY & AI MEMORY
# ==============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Startup Lifespan.
    Initializes SQLite Database, pre-loads vector store & embedding models once.
    """
    print("[STARTUP] Booting RAG AI Assistant Backend...")
    database.init_db()
    await asyncio.to_thread(get_global_embeddings)
    await asyncio.to_thread(get_global_vector_db)
    await asyncio.to_thread(build_vector_db)
    print("[STARTUP] Vector DB, SQLite History & Memory System Ready!")
    yield
    print("[SHUTDOWN] Application shutting down.")

app = FastAPI(title="RAG AI Assistant API with Persistent Chat History & AI Memory", lifespan=lifespan)

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    question: str
    chat_id: Optional[str] = None

class CreateChatRequest(BaseModel):
    title: Optional[str] = "New Conversation"

class DeletePdfRequest(BaseModel):
    filename: str

@app.get("/health")
@app.get("/")
async def health_check():
    return {
        "status": "healthy",
        "service": "RAG AI Assistant API",
        "version": "1.0.0"
    }

# ==============================================================================
# CHAT HISTORY API ENDPOINTS
# ==============================================================================

@app.get("/api/chats")
async def list_chats():
    """
    Get all previous conversations from SQLite database.
    """
    chats = await asyncio.to_thread(database.get_all_chats, "default_user")
    return {"chats": chats}

@app.post("/api/chats")
async def create_chat_session(data: CreateChatRequest):
    """
    Create a new chat session.
    """
    import uuid
    chat_id = f"chat-{uuid.uuid4().hex[:8]}"
    new_chat = await asyncio.to_thread(database.create_chat, chat_id, data.title or "New Conversation", "default_user")
    return {"chat": new_chat}

@app.get("/api/chats/{chat_id}")
async def get_chat_history(chat_id: str):
    """
    Get all messages for a specific chat.
    """
    messages = await asyncio.to_thread(database.get_chat_messages, chat_id)
    return {"chat_id": chat_id, "messages": messages}

@app.delete("/api/chats/{chat_id}")
async def delete_chat_session(chat_id: str):
    """
    Delete a single chat session.
    """
    await asyncio.to_thread(database.delete_chat, chat_id)
    return {"message": "Chat deleted successfully", "chat_id": chat_id}

@app.delete("/api/chats")
async def clear_chats():
    """
    Clear all chat history.
    """
    await asyncio.to_thread(database.clear_all_chats, "default_user")
    return {"message": "All chats cleared successfully"}

@app.get("/api/memories")
async def get_ai_memories():
    """
    View all persistent AI memories extracted for the user.
    """
    memories = await asyncio.to_thread(database.get_all_user_memories, "default_user")
    return {"memories": memories}

# ==============================================================================
# MAIN CHAT & RAG ENDPOINT WITH PERSISTENT MESSAGING
# ==============================================================================

@app.post("/chat")
async def chat(data: ChatRequest):
    """
    Process user query with RAG + AI Memory and save messages in SQLite DB.
    """
    if not data.question or not data.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    chat_id = data.chat_id
    if not chat_id:
        import uuid
        chat_id = f"chat-{uuid.uuid4().hex[:8]}"
        title = data.question[:24] + "..." if len(data.question) > 24 else data.question
        await asyncio.to_thread(database.create_chat, chat_id, title, "default_user")

    # 1. Save user message to SQLite DB
    await asyncio.to_thread(database.add_message, chat_id, "user", data.question)

    # 2. Execute RAG + Memory query in background worker thread
    answer = await asyncio.to_thread(ask_rag, data.question, "default_user", chat_id)
    
    # 3. Save AI bot message to SQLite DB
    bot_msg = await asyncio.to_thread(database.add_message, chat_id, "bot", answer)

    return {
        "chat_id": chat_id,
        "question": data.question,
        "answer": answer,
        "bot_message_id": bot_msg["id"]
    }

@app.post("/chat/stream")
async def chat_stream(data: ChatRequest, request: Request):
    """
    FastAPI Streaming Response Endpoint for ChatGPT-style Real-Time Token Streaming.
    """
    import json
    if not data.question or not data.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    chat_id = data.chat_id
    if not chat_id:
        import uuid
        chat_id = f"chat-{uuid.uuid4().hex[:8]}"
        title = data.question[:32] + "..." if len(data.question) > 32 else data.question
        await asyncio.to_thread(database.create_chat, chat_id, title, "default_user")

    # Save user message to SQLite DB
    await asyncio.to_thread(database.add_message, chat_id, "user", data.question)

    async def event_generator():
        accumulated_text = ""
        try:
            init_payload = json.dumps({"type": "init", "chat_id": chat_id})
            yield f"data: {init_payload}\n\n"

            async for token in ask_rag_stream(data.question, "default_user", chat_id):
                if await request.is_disconnected():
                    print(f"[STREAM CANCELLED] Client disconnected from chat {chat_id}")
                    break
                if token:
                    accumulated_text += token
                    token_payload = json.dumps({"type": "token", "token": token})
                    yield f"data: {token_payload}\n\n"

            if accumulated_text:
                await asyncio.to_thread(database.add_message, chat_id, "bot", accumulated_text)

            end_payload = json.dumps({"type": "done", "chat_id": chat_id, "full_text": accumulated_text})
            yield f"data: {end_payload}\n\n"
        except Exception as e:
            print(f"[STREAM EXCEPTION] {e}")
            err_payload = json.dumps({"type": "error", "error": str(e)})
            yield f"data: {err_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

# ==============================================================================
# PDF DOCUMENT MANAGEMENT ENDPOINTS
# ==============================================================================

@app.get("/pdfs")
async def list_pdfs():
    """
    Instant PDF Listing from Metadata Cache.
    """
    os.makedirs("data", exist_ok=True)
    metadata_store = await asyncio.to_thread(load_pdf_index_metadata)
    pdf_paths = glob.glob("data/*.pdf")
    
    results = []
    metadata_updated = False

    for path in pdf_paths:
        filename = os.path.basename(path)
        if filename in metadata_store:
            info = metadata_store[filename]
            results.append({
                "filename": filename,
                "size": info.get("size", os.path.getsize(path)),
                "pages": info.get("pages", 1),
                "status": "ready"
            })
        else:
            size_bytes = os.path.getsize(path)
            pages = 1
            try:
                loader = PyPDFLoader(path)
                docs = await asyncio.to_thread(loader.load)
                pages = len(docs)
            except Exception:
                pass

            file_info = {
                "filename": filename,
                "hash": "",
                "size": size_bytes,
                "pages": pages,
                "chunks": 0,
                "status": "ready"
            }
            metadata_store[filename] = file_info
            metadata_updated = True
            results.append({
                "filename": filename,
                "size": size_bytes,
                "pages": pages,
                "status": "ready"
            })

    if metadata_updated:
        await asyncio.to_thread(save_pdf_index_metadata, metadata_store)

    return {"pdfs": results}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Incremental PDF Upload Endpoint.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    os.makedirs("data", exist_ok=True)
    file_path = os.path.join("data", file.filename)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
        
    result = await asyncio.to_thread(index_single_pdf, file_path)
    clear_rag_cache()
    
    return {
        "message": "File uploaded and incrementally indexed successfully",
        "filename": file.filename,
        "pages": result.get("pages", 1),
        "chunks": result.get("chunks", 0),
        "status": "ready"
    }

@app.post("/delete_pdf")
async def delete_pdf(data: DeletePdfRequest):
    """
    Fast PDF Removal Endpoint.
    """
    file_path = os.path.join("data", data.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        
        metadata_store = await asyncio.to_thread(load_pdf_index_metadata)
        if data.filename in metadata_store:
            del metadata_store[data.filename]
            await asyncio.to_thread(save_pdf_index_metadata, metadata_store)

        clear_rag_cache()
        return {
            "message": f"{data.filename} deleted successfully.",
            "remaining_pdfs": len(metadata_store)
        }
    else:
        raise HTTPException(status_code=404, detail="File not found")