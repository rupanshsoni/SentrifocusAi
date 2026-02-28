import os
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from groq import Groq
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

app = FastAPI(title="SentriFocus AI - Backend")

# Get the API key from environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env file")

client = Groq(api_key=GROQ_API_KEY)

class IntentCheck(BaseModel):
    goal: str
    site_title: str
    url: str
    context_label: Optional[str] = None

@app.get("/")
def home():
    return {"status": "Brain is Online"}

@app.post("/verify")
async def verify_intent(data: IntentCheck):
    context_hint = data.site_title or data.context_label or data.url

    prompt = f"""You are a helpful academic supervisor. A student is trying to: "{data.goal}"
They are currently accessing: {context_hint}
URL: {data.url}

Strict Guidelines:
1. ALLOWED: Educational content, documentation, research papers, or search queries directly related to the goal.
2. ALLOWED: YouTube videos if the title/search is specifically about the goal.
3. ALLOWED: Search engines (Google/Bing) if the user is searching for things related to the goal.
4. BLOCKED: Social media, entertainment, unrelated YouTube videos, gaming, or general shopping.
5. BLOCKED: YouTube Home, Shorts, or "Trending" pages.

Decision Rule: If the page helps the student achieve "{data.goal}", answer ALLOWED. Otherwise, answer BLOCKED.

Response: ONLY "ALLOWED" or "BLOCKED"."""

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=5
        )
        decision = completion.choices[0].message.content.strip().upper()
        final_decision = "ALLOWED" if "ALLOWED" in decision else "BLOCKED"
        return {"decision": final_decision, "raw": decision}
    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e), "decision": "ALLOWED"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)