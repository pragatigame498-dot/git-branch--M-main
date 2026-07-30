import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise Exception("GOOGLE_API_KEY not found in .env file")

client = genai.Client(api_key=api_key)

print("Available Models:\n")

for model in client.models.list():
    print(model.name)