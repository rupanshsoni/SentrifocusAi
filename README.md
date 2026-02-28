# CognitionX 🧠

> **AI-powered focus enforcement for students. Not a blocker — a brain.**

CognitionX is a native desktop application paired with a Chrome Extension that uses AI-powered screenshot analysis to understand what you're doing on your computer, compare it to your declared study task, and intervene proportionally when distraction is detected — while rewarding sustained focus with a spendable credit economy.

Unlike static website blockers, CognitionX understands *context*. It knows YouTube can be a lecture or a distraction. It responds intelligently in real time.

---

<div align="center">

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-33-47848F?style=flat-square&logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Status](https://img.shields.io/badge/status-active%20development-orange?style=flat-square)

</div>

---

## Table of Contents

- [What is CognitionX](#what-is-cognitionx)
- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Chrome Extension Setup](#chrome-extension-setup)
  - [Gemini API Key](#gemini-api-key)
- [Usage](#usage)
- [Intervention Modes](#intervention-modes)
- [Credit System](#credit-system)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Development](#development)
- [Building for Production](#building-for-production)
- [Contributing](#contributing)
- [Privacy](#privacy)
- [Roadmap](#roadmap)
- [License](#license)

---

## What is CognitionX

College students are not short on time — they are short on **attention**.

Social platforms are engineered to steal focus. Existing tools like website blockers and timers use static rules with zero contextual intelligence. They cannot tell the difference between watching a lecture and watching reels on the same platform.

**CognitionX closes that gap.**

It monitors your screen using AI vision, understands what you're actually doing, and compares it to what you *said* you'd be doing. When you drift, it brings you back — proportionally, intelligently, and without being a jailer.

---

## Features

### 🎯 Intelligent Distraction Detection
- **3-layer detection system** running simultaneously
- **Layer 1 — Process Scanner:** detects Steam, Minecraft, games, and known distractors within 2 seconds, even in the background
- **Layer 2 — Window Watcher:** monitors active window and browser tab titles in real time, fires on every app switch
- **Layer 3 — AI Vision (Gemini):** handles ambiguous cases like YouTube (lecture vs reels) using screenshot analysis

### 🪟 System-Level Overlays
- Intervention popups appear **on top of the distracting app** — not buried in the CognitionX window
- Full-screen translucent backdrop dims the distracting app behind the popup
- Persistent focus bar strip always visible above all applications
- Countdown timer overlay for force-close warnings
- Works above fullscreen games

### 🚨 Proportional Interventions
- **Level 1:** Friendly toast nudge with soft blur
- **Level 2:** Prominent overlay with countdown and options
- **Level 3:** Force close warning — app closes itself if ignored
- Each level escalates only after repeated confirmed distraction

### 🎮 Three Enforcement Modes
- **Gentle** — nudges only, full control, no force close
- **Balanced** — nudges + soft enforcement, minimizes apps after warning
- **Strict** — full enforcement, kills distracting processes, credits disabled, session lock

### 💰 Credit Economy
- Earn credits for sustained focus (10 credits per 5-min focused block)
- Earn bonus credits for completing Pomodoro sessions
- Earn self-correction credits for closing distractions quickly
- Spend credits to delay interventions when you genuinely need a break
- Credits persist across sessions — build up a balance over time

### 📊 Session Analytics
- Real-time focus score during sessions
- Session summary with focus %, time lost, and distraction breakdown
- Historical dashboard with 7-day trend charts
- Top distractions chart across all sessions
- Achievement badges for focus milestones

### 🧩 Chrome Extension
- Real-time tab URL reporting to desktop app
- Blur and mute tab on command from desktop
- Redirect tab to focus-return page at severe intervention levels
- Live focus score visible in extension popup
- Graceful offline fallback — normal browsing unaffected if desktop is closed

### 🔒 Privacy First
- Screenshots are **never saved to disk** — processed in memory and immediately discarded
- All session data stored locally in SQLite — no cloud, no account required
- Exclude any app from monitoring (banking, private messaging, etc.)
- Gemini API key stored locally, never transmitted except to Google's API

---

## How It Works

```
1.  You declare your focus task: "Studying for my calculus midterm"

2.  Three detection layers run in parallel:
    ├── Process Scanner checks all running processes every 2s
    ├── Window Watcher monitors your active window every 1s
    └── Screenshot Engine captures + sends to Gemini AI adaptively

3.  Each layer scores your activity (0–100 relevance to your task)

4.  Score fusion decides what to do:
    ├── Score ≥ 70           → Focused ✓  (earn credits)
    ├── Score < 70 once      → Silent log
    ├── Score < 60 twice     → Level 1 intervention
    ├── Score < 50 three times → Level 2 intervention
    └── Score < 50 four times  → Level 3 (force close)

5.  Intervention overlays appear directly on top of whatever you're
    doing — dimming the distraction behind a focused popup

6.  You can dismiss, delay (spending credits), or ignore (app enforces)

7.  Session ends with a full analytics summary
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop Framework | Electron 33 |
| UI | React 18 + TailwindCSS |
| State Management | Zustand |
| AI Vision | Google Gemini 2.0 Flash via OpenRouter |
| Database | SQLite (better-sqlite3) |
| Image Processing | sharp |
| WebSocket | ws |
| Input Monitoring | uiohook-napi |
| Browser Extension | Chrome MV3 |
| Build Tool | Vite |
| Packaging | electron-builder |

---

## Getting Started

### Prerequisites

- **Node.js** v20.x (must match Electron's internal Node version)
- **npm** v9+
- **Windows 10/11** or **macOS 12+**
- **Google Chrome** (for the extension)
- A **Gemini API key** (free tier available at [aistudio.google.com](https://aistudio.google.com))

> ⚠️ **Node version matters.** Electron 33 uses Node 20 internally. Using Node 22+ will cause native module compilation failures. Use [nvm](https://github.com/nvm-sh/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows) to manage versions.

```bash
# Check your Node version
node --version  # should be v20.x

# If not, switch using nvm
nvm install 20
nvm use 20
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/rupanshsoni/SentrifocusAi.git
cd SentrifocusAi/apps/desktop

# 2. Install dependencies
npm install

# 3. Rebuild native modules for Electron
npx electron-rebuild

# 4. Copy environment file
cp .env.example .env

# 5. Start in development mode
npm run dev
```

> **Windows users:** If you see a PowerShell execution policy error on `npm run dev`, run this once in PowerShell as administrator:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

### Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repository
5. The CognitionX extension icon will appear in your toolbar
6. Launch the desktop app first, then check the extension popup shows **Connected**

### Gemini API Key

CognitionX uses Google's Gemini 2.0 Flash model for AI screenshot analysis.

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **Get API Key** → **Create API key**
4. Copy the key
5. On first launch, CognitionX will ask for this key in the onboarding flow
6. The key is stored locally in your SQLite database — never uploaded anywhere

**Cost estimate:** Gemini 2.0 Flash costs less than $0.05 per hour of active monitoring use. The free tier is sufficient for personal use.

---

## Usage

### Starting a Session

1. Launch CognitionX from your applications or system tray
2. Type your focus task: *"Writing my essay on Renaissance art"*
3. Optionally set a target duration (25 min, 1 hour, etc.)
4. Click **Start Focus Session**
5. Minimize the window — CognitionX runs silently in your system tray

### During a Session

- A **focus bar strip** remains visible at the top of your screen showing your live focus score
- Work normally — CognitionX monitors in the background
- If you drift, an **intervention overlay** appears directly on top of whatever you're doing
- The overlay dims your current screen and presents options to return to focus

### Ending a Session

- Right-click the system tray icon → **End Session**
- Or click **End Session** in the app window
- A summary card shows your focus %, credits earned, and distraction breakdown

### System Tray

Right-click the tray icon at any time to:
- See your current focus score and task
- Pause / Resume monitoring
- End the session
- Open settings
- View credit balance

---

## Intervention Modes

Select your mode in Settings before starting a session.

### 🟢 Gentle Mode
Best for: First-time users, low-distraction environments

- Toast notifications and soft blur only
- Instant dismiss always available
- No apps ever closed automatically
- Credits easy to earn, cheap to spend
- Zero forced countdowns

### 🟡 Balanced Mode *(default)*
Best for: Daily use, most students

- Toast + blur interventions with countdown
- 30-second warning before app is minimized
- Credits available to delay interventions
- Force **minimizes** (does not kill) on ignored warnings
- Buttons unlock after 5-second delay on L2+

### 🔴 Strict Mode
Best for: Exam season, deep work, users who can't trust themselves

- Immediate heavy blur, no instant dismiss
- Force **kills** distracting processes — no minimize, no second chance
- Credits completely disabled — no buying your way out
- Mode **locks** once the session starts — cannot change until session ends
- Buttons unlock only after 10-second forced delay
- Optional: type "OVERRIDE" to emergency exit (once per session)

---

## Credit System

Credits are earned by staying focused and spent to buy flexibility.

### Earning Credits

| Action | Credits |
|--------|---------|
| 5-minute focused block (score ≥ 80) | +10 |
| Complete 25-minute Pomodoro (score ≥ 70) | +50 |
| Self-correct within 15s of Level 1 nudge | +5 |
| First session of the day | +20 |
| Daily streak bonus (per streak day) | +10 × streak |

### Spending Credits

| Action | Cost |
|--------|------|
| Delay intervention 5 minutes | 20 credits |
| Delay intervention 15 minutes | 60 credits |
| Delay intervention 30 minutes | 150 credits |

> Credits are disabled in Strict mode.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   DESKTOP APP (Electron)                     │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │  Process    │  │  Window     │  │  Screenshot Engine   │ │
│  │  Scanner    │  │  Watcher    │  │  + Gemini AI         │ │
│  │  (Layer 1)  │  │  (Layer 2)  │  │  (Layer 3)           │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘ │
│         └────────────────┴──────────────────── ┘            │
│                           ↓                                  │
│                  Detection Fusion Engine                     │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Intervention Engine                      │   │
│  │         (5-level state machine)                       │   │
│  └─────────────────────────┬────────────────────────────┘   │
│                             │                                │
│        ┌────────────────────┼────────────────────┐          │
│        ↓                    ↓                    ↓          │
│  ┌──────────┐  ┌─────────────────────┐  ┌──────────────┐   │
│  │ Overlay  │  │   Credit System     │  │  WebSocket   │   │
│  │ Manager  │  │   + Session Mgr     │  │  Server :7823│   │
│  └──────────┘  └─────────────────────┘  └──────┬───────┘   │
│       ↓                      ↓                  │           │
│  [System-level         [SQLite DB]               │           │
│   overlay windows]                               │           │
└──────────────────────────────────────────────────┼───────────┘
                                                   │ WebSocket
┌──────────────────────────────────────────────────┼───────────┐
│              CHROME EXTENSION                     │           │
│  ┌─────────────────┐   ┌──────────────────────┐  │           │
│  │ Service Worker  │←──│  WebSocket Client    │←─┘           │
│  └────────┬────────┘   └──────────────────────┘              │
│           ↓                                                   │
│  ┌────────────────┐   ┌─────────────────────┐                │
│  │ Content Script │   │  Popup UI           │                │
│  │ (Blur/Mute/    │   │  (Score + Task)     │                │
│  │  Overlay)      │   └─────────────────────┘                │
│  └────────────────┘                                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
cognitionx/
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── main/                    # Electron main process
│       │   │   ├── index.js             # App entry point
│       │   │   ├── core/
│       │   │   │   ├── processScanner.js      # Layer 1: process detection
│       │   │   │   ├── windowWatcher.js       # Layer 2: window detection
│       │   │   │   ├── screenshotEngine.js    # Layer 3: screen capture
│       │   │   │   ├── aiEngine.js            # Gemini API integration
│       │   │   │   ├── interventionEngine.js  # State machine
│       │   │   │   ├── creditSystem.js        # Credit economy
│       │   │   │   ├── sessionManager.js      # Session lifecycle
│       │   │   │   ├── wsServer.js            # WebSocket server
│       │   │   │   └── rulesets.js            # App/site detection rules
│       │   │   ├── overlays/
│       │   │   │   ├── overlayManager.js      # Manages all overlay windows
│       │   │   │   ├── interventionOverlay.js # Main intervention popup
│       │   │   │   ├── focusBarOverlay.js     # Persistent focus strip
│       │   │   │   ├── countdownOverlay.js    # Force-close countdown
│       │   │   │   └── creditNotification.js  # Credit earned toast
│       │   │   ├── ipc/
│       │   │   │   └── handlers.js            # IPC event handlers
│       │   │   └── db/
│       │   │       ├── database.js            # SQLite connection
│       │   │       └── queries.js             # SQL query functions
│       │   │
│       │   ├── renderer/                # React frontend
│       │   │   ├── pages/
│       │   │   │   ├── Onboarding.jsx
│       │   │   │   ├── SessionStart.jsx
│       │   │   │   ├── ActiveSession.jsx
│       │   │   │   ├── SessionSummary.jsx
│       │   │   │   ├── Dashboard.jsx
│       │   │   │   └── Settings.jsx
│       │   │   ├── components/
│       │   │   │   ├── FocusBar.jsx
│       │   │   │   ├── CreditDisplay.jsx
│       │   │   │   └── SummaryCard.jsx
│       │   │   ├── overlays/            # Overlay window React roots
│       │   │   │   ├── InterventionOverlayApp.jsx
│       │   │   │   ├── FocusBarApp.jsx
│       │   │   │   ├── CountdownApp.jsx
│       │   │   │   └── CreditNotificationApp.jsx
│       │   │   └── store/
│       │   │       └── sessionStore.js  # Zustand global state
│       │   │
│       │   └── preload/
│       │       ├── preload.js           # Main window IPC bridge
│       │       └── overlayPreload.js    # Overlay windows IPC bridge
│       │
│       ├── db/
│       │   └── schema.sql
│       ├── .env.example
│       └── package.json
│
└── extension/                           # Chrome Extension (MV3)
    ├── manifest.json
    ├── background/
    │   └── service-worker.js
    ├── content/
    │   └── content-script.js
    ├── popup/
    │   ├── popup.html
    │   └── popup.js
    └── pages/
        └── focus-return.html
```

---

## Development

```bash
# Start development server (Vite + Electron with hot reload)
npm run dev

# Run only the Vite dev server
npm run dev:vite

# Run only Electron (assumes Vite is running)
npm run dev:electron

# Lint
npm run lint

# Type check (if configured)
npm run typecheck
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# .env
GEMINI_API_KEY=your_gemini_api_key_here
```

> The API key can also be set through the in-app onboarding UI and is stored in SQLite. The `.env` variable is optional and used during development only.

### Common Issues

**Native module errors on `npm run dev`**
```bash
npx electron-rebuild
```

**PowerShell execution policy error (Windows)**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

**Electron version vs Node version mismatch**
```bash
node --version      # must be v20.x
npx electron --version  # v33.x uses Node 20 internally
nvm use 20          # switch if needed
```

**Screenshot permission denied (macOS)**
Go to System Preferences → Security & Privacy → Screen Recording → enable CognitionX

---

## Building for Production

```bash
# Build React via Vite
npm run build

# Package with electron-builder
npx electron-builder

# Output in /dist:
# Windows: CognitionX-Setup-1.0.0.exe
# macOS:   CognitionX-1.0.0.dmg
# Linux:   CognitionX-1.0.0.AppImage
```

### Code Signing

Without code signing, users will see security warnings:
- **Windows:** Click "More info" → "Run anyway"
- **macOS:** Right-click the app → "Open" → "Open"

For production distribution with signed installers, a code signing certificate is required (Windows: DigiCert/Sectigo, macOS: Apple Developer account).

---

## Contributing

CognitionX is actively developed. Contributions are welcome.

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/SentrifocusAi.git

# Create a feature branch
git checkout -b feature/your-feature-name

# Commit using the project format
git commit -m "[component] Short description"

# Examples:
# [detection] Improve Store app process name matching
# [ui] Add streak display to ActiveSession page
# [credits] Fix self-correction bonus timing

# Push and open a pull request
git push origin feature/your-feature-name
```

### Branch Naming

```
feature/component-name     # new features
fix/bug-description        # bug fixes
refactor/module-name       # refactoring
docs/what-you-documented   # documentation only
```

### Commit Format

```
[component] Short description

Components: screenshot, ai-engine, detection, extension,
            ui, credits, db, session, overlay, ipc
```

---

## Privacy

CognitionX is built with privacy as a core constraint, not an afterthought.

| What we do | What we don't do |
|-----------|-----------------|
| Analyze screenshots in memory | ❌ Save screenshots to disk |
| Store session data in local SQLite | ❌ Upload data to any server |
| Use your Gemini API key directly | ❌ Route data through our servers |
| Let you exclude sensitive apps | ❌ Monitor excluded apps |
| Delete screenshots after analysis | ❌ Build behavioral profiles |
| Work fully offline (except Gemini calls) | ❌ Require account or login |

Your data never leaves your machine except for screenshot analysis calls sent directly from your device to Google's Gemini API using your own API key.

---

## Roadmap

### In Progress
- [ ] System-level overlay windows (interventions above all apps)
- [ ] Persistent focus bar strip
- [ ] Three enforcement modes (Gentle / Balanced / Strict)
- [ ] Force-close app flow with countdown

### Planned
- [ ] Gemini-generated personalised intervention messages
- [ ] Commitment contract (user's own words in interventions)
- [ ] Distraction prediction (pre-emptive nudges based on patterns)
- [ ] Scheduled mode switching (Strict 9am-5pm, Gentle evenings)
- [ ] Accountability buddy (paired focus sessions)
- [ ] Study room (shared focus leaderboard with friends)
- [ ] Mobile companion app (phone notification when PC idle mid-session)
- [ ] Local LLM mode (privacy-first, no API calls)
- [ ] Pomodoro mode with structured breaks

### Considering
- [ ] VS Code / Cursor extension integration
- [ ] Calendar-aware sensitivity (exam tomorrow → stricter mode auto-enabled)
- [ ] Weekly focus reports via email
- [ ] Public focus streak sharing

---

## Built At

CognitionX was originally built at **CognitionX Ideathon** under the theme *Attention Economy on Campus*.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built for students who know they should focus but need a little help getting there.**

[Report a Bug](https://github.com/rupanshsoni/SentrifocusAi/issues) · [Request a Feature](https://github.com/rupanshsoni/SentrifocusAi/issues) · [Discussions](https://github.com/rupanshsoni/SentrifocusAi/discussions)

</div>
