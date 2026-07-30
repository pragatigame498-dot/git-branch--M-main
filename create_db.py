import os
import hashlib
import json
import glob
from typing import Dict, List, Any
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

# ==============================================================================
# PERFORMANCE & SEMANTIC CHUNKING PIPELINE
# - Chunk Size: 700, Chunk Overlap: 150
# - Heading preservation: keeps section titles, definitions, and code examples together.
# ==============================================================================

VECTOR_STORE_DIR = "vector_store"
DATA_DIR = "data"
INDEX_METADATA_FILE = os.path.join(DATA_DIR, "pdf_index.json")

# Global Embeddings Singleton
_GLOBAL_EMBEDDINGS = None
# Global Chroma DB Singleton
_GLOBAL_VECTOR_DB = None

def get_global_embeddings() -> OllamaEmbeddings:
    global _GLOBAL_EMBEDDINGS
    if _GLOBAL_EMBEDDINGS is None:
        print("[INIT] Initializing Global Embedding Model (nomic-embed-text)...")
        _GLOBAL_EMBEDDINGS = OllamaEmbeddings(model="nomic-embed-text")
    return _GLOBAL_EMBEDDINGS

def get_global_vector_db() -> Chroma:
    global _GLOBAL_VECTOR_DB
    if _GLOBAL_VECTOR_DB is None:
        embeddings = get_global_embeddings()
        print("[INIT] Loading Global Chroma Vector DB into memory...")
        _GLOBAL_VECTOR_DB = Chroma(
            persist_directory=VECTOR_STORE_DIR,
            embedding_function=embeddings
        )
    return _GLOBAL_VECTOR_DB

def compute_file_hash(file_path: str) -> str:
    hasher = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def load_pdf_index_metadata() -> Dict[str, Any]:
    if os.path.exists(INDEX_METADATA_FILE):
        try:
            with open(INDEX_METADATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[WARNING] Could not read PDF index metadata: {e}")
    return {}

def save_pdf_index_metadata(metadata: Dict[str, Any]) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(INDEX_METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

def index_single_pdf(file_path: str, force_reindex: bool = False) -> Dict[str, Any]:
    filename = os.path.basename(file_path)
    metadata_store = load_pdf_index_metadata()
    file_hash = compute_file_hash(file_path)
    file_size = os.path.getsize(file_path)

    if not force_reindex and filename in metadata_store and metadata_store[filename].get("hash") == file_hash:
        print(f"[CACHE HIT] Skipping {filename} - already indexed into Vector DB.")
        return {
            "filename": filename,
            "pages": metadata_store[filename].get("pages", 0),
            "chunks": metadata_store[filename].get("chunks", 0),
            "cached": True
        }

    print(f"[INDEXING] Processing document with Heading Preservation (700/150): {filename}")
    try:
        loader = PyPDFLoader(file_path)
        docs = loader.load()
    except Exception as e:
        print(f"[ERROR] Failed to load {file_path}: {e}")
        return {"filename": filename, "pages": 0, "chunks": 0, "error": str(e)}

    # Attach file source metadata to every document page
    for doc in docs:
        doc.metadata["source_filename"] = filename

    # Chunking configuration: chunk_size=700, chunk_overlap=150
    # Custom separators prioritize heading breaks and paragraph blocks to keep definitions intact.
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=700,
        chunk_overlap=150,
        separators=[
            "\n# ",
            "\n## ",
            "\n### ",
            "\nPART ",
            "\n1.",
            "\n2.",
            "\n3.",
            "\n4.",
            "\n5.",
            "\n6.",
            "\n7.",
            "\n8.",
            "\n\n",
            "\n",
            " "
        ]
    )
    chunks = splitter.split_documents(docs)

    if chunks:
        db = get_global_vector_db()
        db.add_documents(chunks)

    file_info = {
        "filename": filename,
        "hash": file_hash,
        "size": file_size,
        "pages": len(docs),
        "chunks": len(chunks),
        "status": "ready"
    }
    metadata_store[filename] = file_info
    save_pdf_index_metadata(metadata_store)

    print(f"[SUCCESS] Indexed {filename}: {len(docs)} pages, {len(chunks)} chunks.")
    return file_info

def build_vector_db(force_reindex: bool = False) -> Dict[str, Any]:
    os.makedirs(DATA_DIR, exist_ok=True)
    pdf_files = glob.glob(os.path.join(DATA_DIR, "*.pdf"))
    
    total_pages = 0
    total_chunks = 0
    
    metadata_store = load_pdf_index_metadata()

    for pdf_file in pdf_files:
        info = index_single_pdf(pdf_file, force_reindex=force_reindex)
        total_pages += info.get("pages", 0)
        total_chunks += info.get("chunks", 0)

    # Clean up metadata for deleted files
    current_filenames = {os.path.basename(p) for p in pdf_files}
    stale_keys = [k for k in metadata_store if k not in current_filenames]
    if stale_keys:
        for k in stale_keys:
            del metadata_store[k]
        save_pdf_index_metadata(metadata_store)

    return {"pages": total_pages, "chunks": total_chunks}

if __name__ == "__main__":
    build_vector_db()