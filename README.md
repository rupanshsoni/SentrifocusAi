# CognitionX

**CognitionX** is an AI-powered, system-level focus enforcement application for students and professionals. Built with Electron and React, it actively monitors your desktop environment, intelligently categorizes active applications using Google's Gemini AI, and deploys system-level overlays to keep you on track.

---

## 🚀 Key Features

*   **Intelligent Distraction Detection**: Monitors active windows and uses Gemini AI vision/text analysis to categorize them as `FOCUS`, `SOCIAL`, `ENTERTAINMENT`, etc.
*   **System-Level Overlays**: Utilizes dedicated, transparent Electron `BrowserWindow` instances (`alwaysOnTop: 'screen-saver'`) that appear *above* all other applications, including full-screen games.
*   **Dynamic Intervention Engine**:
    *   **Gentle Mode**: Sends subtle, non-intrusive nudge notifications.
    *   **Balanced Mode**: Displays interactive overlay cards asking you to refocus.
    *   **Strict Mode**: Automatically force-closes distracting applications.
*   **Focus Rewards System**: Earn credits for maintaining focus, which can be spent on "guilt-free" breaks.
*   **Customizable Rules**: Whitelist essential apps (e.g., `code.exe`) or blacklist known distractions (e.g., `Discord.exe`).
*   **Modern UI**: Fully responsive, landscape-optimized dashboard built with React and Tailwind CSS v4.

---

## 🛠️ Technology Stack

*   **Core**: Electron
*   **Frontend**: React, Zustand (State Management)
*   **Styling**: Tailwind CSS v4
*   **Build Tool**: Vite (Multi-entry config for main app + overlays)
*   **AI Engine**: `@google/generative-ai` (Gemini API)
*   **Database**: `better-sqlite3`
*   **OS APIs**: `@paymoapp/active-window`, `uiohook-napi`

---

## ⚙️ Setup & Installation

### Prerequisites
*   Node.js (v20+ recommended)
*   Windows OS (for native bindings like `active-window`)
*   Google Gemini API Key

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd cognitionx/apps/desktop
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root of the project and add your Gemini API key:
```env
GEMINI_API_KEY="your-api-key-here"
```

### 3. Rebuild Native Dependencies
Because CognitionX uses native Node modules (`better-sqlite3`, `uiohook-napi`), you must rebuild them for Electron:
```bash
npm run rebuild
```

### 4. Run Locally
To start the Vite dev server and the Electron application concurrently:
```bash
npm run dev
```

---

## 📦 Packaging for Distribution

CognitionX is configured to use `electron-packager` to circumvent symlink permission issues on Windows.

To build the standalone Windows executable (`.exe`):
```bash
npm run dist:win
```
The compiled application will be available in the `release/CognitionX-win32-x64/` directory.

---

## 📄 License
ISC License
