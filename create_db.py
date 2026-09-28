import os
import gc
import time
import hashlib
import json
import glob
from typing import Dict, List, Any
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_ollama import OllamaEmbeddings

import config

# Global Embeddings Singleton
_GLOBAL_EMBEDDINGS = None
# Global Chroma DB Singleton
_GLOBAL_VECTOR_DB = None

def get_global_embeddings():
    global _GLOBAL_EMBEDDINGS
    if _GLOBAL_EMBEDDINGS is None:
        print("[INIT] Initializing Ultra-Fast Local Embedding Model (FastEmbed)...")
        try:
            _GLOBAL_EMBEDDINGS = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
            print("[INIT] FastEmbed ONNX Model Ready!")
        except Exception as e:
            print(f"[WARNING] FastEmbed fallback to Ollama: {e}")
            _GLOBAL_EMBEDDINGS = OllamaEmbeddings(model="nomic-embed-text")
    return _GLOBAL_EMBEDDINGS

def get_global_vector_db() -> Chroma:
    global _GLOBAL_VECTOR_DB
    if _GLOBAL_VECTOR_DB is None:
        embeddings = get_global_embeddings()
        print("[INIT] Loading Global Chroma Vector DB into memory...")
        _GLOBAL_VECTOR_DB = Chroma(
            persist_directory=config.VECTOR_STORE_DIR,
            embedding_function=embeddings
        )
    return _GLOBAL_VECTOR_DB

def compute_file_hash(file_path: str) -> str:
    """Compute SHA-256 hash of file for robust deduplication."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def load_pdf_index_metadata() -> Dict[str, Any]:
    if os.path.exists(config.INDEX_METADATA_FILE):
        try:
            with open(config.INDEX_METADATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[WARNING] Could not read PDF index metadata: {e}")
    return {}

def save_pdf_index_metadata(metadata: Dict[str, Any]) -> None:
    os.makedirs(config.DATA_DIR, exist_ok=True)
    with open(config.INDEX_METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

def index_single_pdf(file_path: str, force_reindex: bool = False) -> Dict[str, Any]:
    t_start = time.time()
    filename = os.path.basename(file_path)
    metadata_store = load_pdf_index_metadata()
    file_hash = compute_file_hash(file_path)
    file_size = os.path.getsize(file_path)

    # 1. File Size Protection Check
    max_bytes = config.MAX_PDF_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        err_msg = f"File size ({round(file_size / (1024*1024), 2)}MB) exceeds limit of {config.MAX_PDF_SIZE_MB}MB."
        print(f"[REJECT] {filename}: {err_msg}")
        return {"filename": filename, "pages": 0, "chunks": 0, "status": "failed", "error": err_msg}

    # 2. SHA-256 Deduplication Hit
    if not force_reindex and filename in metadata_store and metadata_store[filename].get("hash") == file_hash:
        print(f"[CACHE HIT] Skipping {filename} - already indexed into Vector DB.")
        return {
            "filename": filename,
            "pages": metadata_store[filename].get("pages", 0),
            "chunks": metadata_store[filename].get("chunks", 0),
            "status": "ready",
            "cached": True
        }

    print(f"[INDEXING] Processing {filename} (Size: {round(file_size/(1024*1024), 2)}MB)...")
    
    # 3. Document Extraction Step
    t0 = time.time()
    try:
        loader = PyPDFLoader(file_path)
        docs = loader.load()
    except Exception as e:
        print(f"[ERROR] Failed to load PDF {file_path}: {e}")
        return {"filename": filename, "pages": 0, "chunks": 0, "status": "failed", "error": str(e)}
    extraction_time = round(time.time() - t0, 3)

    # 4. Page Protection Check
    if len(docs) > config.MAX_PDF_PAGES:
        err_msg = f"PDF page count ({len(docs)}) exceeds maximum limit of {config.MAX_PDF_PAGES} pages."
        print(f"[REJECT] {filename}: {err_msg}")
        return {"filename": filename, "pages": len(docs), "chunks": 0, "status": "failed", "error": err_msg}

    for doc in docs:
        doc.metadata["source_filename"] = filename

    # 5. Chunking Step
    t0 = time.time()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP,
        separators=["\n# ", "\n## ", "\n### ", "\nPART ", "\n1.", "\n2.", "\n\n", "\n", " "]
    )
    chunks = splitter.split_documents(docs)
    chunking_time = round(time.time() - t0, 3)

    # 6. Embedding & Vector DB Insertion Step
    t0 = time.time()
    if chunks:
        db = get_global_vector_db()
        batch_size = config.EMBEDDING_BATCH_SIZE
        for i in range(0, len(chunks), batch_size):
            db.add_documents(chunks[i:i + batch_size])
    vector_db_time = round(time.time() - t0, 3)

    total_time = round(time.time() - t_start, 3)

    file_info = {
        "filename": filename,
        "hash": file_hash,
        "size": file_size,
        "pages": len(docs),
        "chunks": len(chunks),
        "status": "ready",
        "processing_time_seconds": total_time
    }
    metadata_store[filename] = file_info
    save_pdf_index_metadata(metadata_store)

    print(f"[PERFORMANCE LOG] PDF Processing for {filename}:\n"
          f"  - Extraction Time: {extraction_time}s\n"
          f"  - Chunking Time: {chunking_time}s\n"
          f"  - Embedding & Vector DB Time: {vector_db_time}s\n"
          f"  - Total Processing Time: {total_time}s\n"
          f"  - Pages: {len(docs)}, Chunks: {len(chunks)}")

    # 7. Memory Cleanup
    del docs
    del chunks
    gc.collect()

    return file_info

def build_vector_db(force_reindex: bool = False) -> Dict[str, Any]:
    os.makedirs(config.DATA_DIR, exist_ok=True)
    pdf_files = glob.glob(os.path.join(config.DATA_DIR, "*.pdf"))
    
    total_pages = 0
    total_chunks = 0
    metadata_store = load_pdf_index_metadata()

    for pdf_file in pdf_files:
        info = index_single_pdf(pdf_file, force_reindex=force_reindex)
        total_pages += info.get("pages", 0)
        total_chunks += info.get("chunks", 0)

    current_filenames = {os.path.basename(p) for p in pdf_files}
    stale_keys = [k for k in metadata_store if k not in current_filenames]
    if stale_keys:
        for k in stale_keys:
            del metadata_store[k]
        save_pdf_index_metadata(metadata_store)

    return {"pages": total_pages, "chunks": total_chunks}

if __name__ == "__main__":
    build_vector_db()