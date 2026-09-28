import os
from dotenv import load_dotenv

load_dotenv()

# ==============================================================================
# CENTRALIZED RAG SYSTEM PERFORMANCE & SAFETY CONFIGURATION
# ==============================================================================

# PDF Document Safeguards
MAX_PDF_SIZE_MB = int(os.getenv("MAX_PDF_SIZE_MB", "50"))
MAX_PDF_PAGES = int(os.getenv("MAX_PDF_PAGES", "500"))

# Chunking Configuration
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "700"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "70"))

# Embedding & Vector Database Settings
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "32"))
TOP_K = int(os.getenv("TOP_K", "4"))
VECTOR_STORE_DIR = os.getenv("VECTOR_STORE_DIR", "vector_store")
DATA_DIR = os.getenv("DATA_DIR", "data")
INDEX_METADATA_FILE = os.path.join(DATA_DIR, "pdf_index.json")

# LLM Timeout & Execution Parameters
LLM_TIMEOUT_SECONDS = int(os.getenv("LLM_TIMEOUT_SECONDS", "30"))
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

# CORS & Server Settings
ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_RAW.split(",") if origin.strip()]
