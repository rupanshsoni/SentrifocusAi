import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from groq import Groq

app = FastAPI(title="SentriFocus AI - Backend")

# Keep your API key as is
GROQ_API_KEY = "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"
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
    # Use the site title or context label to give the AI the best chance to understand
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
        # Ensure we only return one of the two keywords
        final_decision = "ALLOWED" if "ALLOWED" in decision else "BLOCKED"
        return {"decision": final_decision, "raw": decision}
    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e), "decision": "ALLOWED"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)