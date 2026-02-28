# SentriFocus AI 🧠🛡️

**SentriFocus AI** is a smart, real-time semantic gatekeeper designed to help students and researchers maintain deep focus. It uses a FastAPI backend powered by the Groq Llama 3.1 model to analyze browsing intent and block distractions with a graceful 5-second countdown.

---

## 🌟 Features

- **Smart Onboarding:** Automatically prompts you to set a focus goal and timer the moment you open a New Tab.
- **AI Intent Verification:** Uses LLMs to distinguish between educational research (e.g., CT scan analysis) and entertainment (e.g., Hotstar, Instagram).
- **Strict YouTube Guard:** Blocks YouTube Home, Shorts, and Trending, while allowing specific educational videos related to your goal.
- **Graceful Blocking:** Instead of an instant crash, it provides a 5-second countdown overlay to let you wrap up or realize you've drifted.
- **Session Management:** Automatically transitions to a "Task Completed" screen when the timer ends, allowing you to restart or return to normal browsing.

---

## 📂 Project Structure

```text
SentrifocusAi/
├── backend/
│   ├── main.py            # FastAPI server & AI logic
│   └── requirements.txt   # Python dependencies
├── extension/             # Chrome Extension source files
│   ├── manifest.json      # Extension configuration
│   ├── background.js      # Core logic & state management
│   ├── content.js         # UI Injection & countdown overlay
│   ├── onboarding.html    # Initial focus prompt
│   └── session_over.html  # Post-timer summary screen
├── .env                   # API Keys (Not to be committed)
└── README.md
```

---

## 🚀 Getting Started

### 1️⃣ Prerequisites

- Python 3.8+
- Google Chrome Browser
- Groq API Key (Get one at https://console.groq.com)

---

### 2️⃣ Backend Setup

Navigate to the backend folder:

```bash
cd backend
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the root and add your key:

```plaintext
GROQ_API_KEY=your_key_here
```

Start the server:

```bash
python main.py
```

---

### 3️⃣ Extension Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer Mode** (top right)
3. Click **Load Unpacked**
4. Select the `extension` folder from this project

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Chrome Extension V3 API)
- **Backend:** FastAPI, Uvicorn
- **AI Model:** Llama-3.1-8b via Groq Cloud API

---

## 📌 Notes

- Do **not** commit your `.env` file.
- Make sure the backend server is running before using the extension.
- Designed for productivity-focused students and researchers.

---

## 📄 License

This project is open-source and available under the MIT License.

---

**Built with focus, for focus. 🎯**
