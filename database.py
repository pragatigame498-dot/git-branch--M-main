import sqlite3
import os
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any

DB_PATH = "rag_chatbot.db"

def get_connection():
    """
    Get a connection to the SQLite database.
    """
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initialize SQLite database tables for users, chats, messages, memory, and uploaded_documents.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at TEXT
    );
    """)

    # Chats Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
    """)

    # Messages Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT,
        role TEXT,
        content TEXT,
        timestamp TEXT,
        FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );
    """)

    # AI Memory Table (Persistent Personal Facts)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        category TEXT,
        fact TEXT,
        updated_at TEXT,
        UNIQUE(user_id, category)
    );
    """)

    # Uploaded Documents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS uploaded_documents (
        id TEXT PRIMARY KEY,
        chat_id TEXT,
        filename TEXT,
        file_path TEXT,
        pages INTEGER,
        chunks INTEGER,
        created_at TEXT
    );
    """)

    # Insert default user if not exists
    cursor.execute("SELECT id FROM users WHERE id = 'default_user';")
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO users (id, name, created_at) VALUES (?, ?, ?);",
            ("default_user", "Pragati Game", datetime.now().isoformat())
        )

    conn.commit()
    conn.close()
    print("[DB] SQLite database initialized successfully.")

# ==============================================================================
# CHAT CRUD OPERATIONS
# ==============================================================================

def create_chat(chat_id: str, title: str = "New Conversation", user_id: str = "default_user") -> Dict[str, Any]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute(
            "INSERT OR REPLACE INTO chats (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?);",
            (chat_id, user_id, title, now, now)
        )
        conn.commit()
        return {"id": chat_id, "user_id": user_id, "title": title, "created_at": now, "updated_at": now}
    finally:
        conn.close()

def get_all_chats(user_id: str = "default_user") -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT c.id, c.title, c.created_at, c.updated_at,
               (SELECT content FROM messages WHERE chat_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message
        FROM chats c
        WHERE c.user_id = ?
        ORDER BY c.updated_at DESC;
        """, (user_id,))
        rows = cursor.fetchall()
        
        chats = []
        for r in rows:
            chats.append({
                "id": r["id"],
                "title": r["title"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
                "last_message": r["last_message"] or ""
            })
        return chats
    finally:
        conn.close()

def get_chat_messages(chat_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, role as sender, content as text, timestamp
        FROM messages
        WHERE chat_id = ?
        ORDER BY timestamp ASC;
        """, (chat_id,))
        rows = cursor.fetchall()

        messages = []
        for r in rows:
            sender = 'user' if r["sender"] in ('user', 'human') else 'bot'
            messages.append({
                "id": r["id"],
                "sender": sender,
                "text": r["content"],
                "timestamp": r["timestamp"]
            })
        return messages
    finally:
        conn.close()

def add_message(chat_id: str, sender: str, text: str, msg_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        if not msg_id:
            msg_id = f"msg-{sender}-{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()

        # Ensure chat exists
        cursor.execute("SELECT id, title FROM chats WHERE id = ?;", (chat_id,))
        chat_row = cursor.fetchone()
        if not chat_row:
            title = text[:24] + "..." if len(text) > 24 else text
            cursor.execute(
                "INSERT INTO chats (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?);",
                (chat_id, "default_user", title, now, now)
            )
        else:
            cursor.execute("UPDATE chats SET updated_at = ? WHERE id = ?;", (now, chat_id))

        role = "user" if sender == "user" else "assistant"
        cursor.execute(
            "INSERT INTO messages (id, chat_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?);",
            (msg_id, chat_id, role, text, now)
        )
        conn.commit()
        return {"id": msg_id, "chat_id": chat_id, "sender": sender, "text": text, "timestamp": now}
    finally:
        conn.close()

def update_chat_title(chat_id: str, new_title: str):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE chats SET title = ?, updated_at = ? WHERE id = ?;", (new_title, datetime.now().isoformat(), chat_id))
        conn.commit()
    finally:
        conn.close()

def delete_chat(chat_id: str):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE chat_id = ?;", (chat_id,))
        cursor.execute("DELETE FROM uploaded_documents WHERE chat_id = ?;", (chat_id,))
        cursor.execute("DELETE FROM chats WHERE id = ?;", (chat_id,))
        conn.commit()
    finally:
        conn.close()

def clear_all_chats(user_id: str = "default_user"):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE user_id = ?);", (user_id,))
        cursor.execute("DELETE FROM uploaded_documents WHERE chat_id IN (SELECT id FROM chats WHERE user_id = ?);", (user_id,))
        cursor.execute("DELETE FROM chats WHERE user_id = ?;", (user_id,))
        conn.commit()
    finally:
        conn.close()

# ==============================================================================
# AI MEMORY CRUD OPERATIONS
# ==============================================================================

def save_user_memory(category: str, fact: str, user_id: str = "default_user"):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        mem_id = f"mem-{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()
        cursor.execute("""
        INSERT INTO memory (id, user_id, category, fact, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, category) DO UPDATE SET
            fact = excluded.fact,
            updated_at = excluded.updated_at;
        """, (mem_id, user_id, category, fact, now))
        conn.commit()
        print(f"[MEMORY DB] Saved memory for {user_id} -> {category}: {fact}")
    finally:
        conn.close()

def get_all_user_memories(user_id: str = "default_user") -> Dict[str, str]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT category, fact FROM memory WHERE user_id = ?;", (user_id,))
        rows = cursor.fetchall()
        return {r["category"]: r["fact"] for r in rows}
    finally:
        conn.close()

# Initialize DB on module import
init_db()
