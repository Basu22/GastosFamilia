import os
from google import genai
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
for m in client.models.list():
    if "generateContent" in getattr(m, "supported_generation_methods", []) or True:
        print(m.name)
