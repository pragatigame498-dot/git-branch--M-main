import os
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=api_key,
)

loader1 = PyPDFLoader("data/baap.pdf")
loader2 = PyPDFLoader("data/bank.pdf")

docs = loader1.load() + loader2.load()

print("Pages:", len(docs))

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)

chunks = splitter.split_documents(docs)

print("Chunks:", len(chunks))

db = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="vector_store"
)

print("Vector DB Created Successfully")