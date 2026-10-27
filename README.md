<div align="center">

# 🦜 PARROT

### **100% On-Device Meeting Intelligence Platform**

*Say goodbye to expensive cloud subscriptions like Otter.ai, Fireflies.ai, and Read.ai.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Whisper](https://img.shields.io/badge/Faster_Whisper-FF6F00?style=for-the-badge&logo=openai&logoColor=white)](https://github.com/SYSTRAN/faster-whisper)
[![Ollama](https://img.shields.io/badge/Ollama_Qwen_2.5_7B-000000?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.ai/)

---

### 🛡️ **Zero Cloud Uploads** • ⚡ **Real-Time Speed** • 🔒 **100% Data Ownership** • 0️⃣ **$0 Subscriptions**

</div>

<br />

## 🌟 Why Parrot?

Most meeting assistant apps store your sensitive corporate conversations on external cloud servers and charge heavy monthly fees. **Parrot** runs **100% locally on your machine**.

Powered by **Faster-Whisper (Turbo CPU int8)** and **Qwen 2.5 7B via Ollama**, Parrot delivers production-grade meeting transcription, executive summaries, and action item tracking directly on your CPU/GPU without sacrificing data privacy.

---

## 🔥 Key Features

- **🎙️ Interactive Audio Player & Waveform**
  - Record live meeting audio via microphone or upload existing recordings (`.mp3`, `.wav`, `.m4a`, `.webm`).
  - Tactile **waveform visualization** with multi-speed playback (\(1\times, 1.25\times, 1.5\times, 2\times\)).
  - Click any segment in the diarized transcript to instantly scrub to that exact audio timestamp.

- **🗣️ Smart Diarization & Live Search**
  - Accurate speaker separation based on conversational turn transitions and natural pause thresholds.
  - **Live dialogue search bar** to filter transcripts and locate discussed keywords instantly.

- **🧠 Executive Intelligence Suite (Qwen 2.5 7B)**
  - **Executive Summaries**: High-impact overviews and core takeaways extracted with zero hallucinations.
  - **Action Items Matrix**: Tasks categorized by explicit owner, deadline, and priority rating (High / Medium / Low).
  - **Key Decisions & Next Steps**: Immediate consensus logs to eliminate post-meeting ambiguity.
  - **Calculated Speaker Analytics**: Ground-truth talk-time distribution percentage and conversational sentiment analysis.
  - **Theme & Topic Tagging**: Instant topic pills indexing core discussion subjects.

- **⚡ Asynchronous Background Job Architecture**
  - Dedicated background worker threads ensuring zero network timeouts or broken connections during long meeting uploads.
  - Neo-Brutalist **live processing modal** with a server-synchronized, accurate countdown timer and progress indicators.

- **📋 Export & Local History**
  - **1-Click Markdown / Notion Export**: Copy structured meeting notes directly to your clipboard.
  - Centralized **local SQLite database** with instant review and meeting management controls.

- **🛡️ Privacy First, Always**
  - Zero telemetry. Zero external API keys required. 100% offline data sovereignty.

---

## 🏗️ Architecture & Data Flow

```text
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│   Audio Upload / Mic   │ ───► │  Turbo Faster-Whisper  │ ───► │   Diarized Timestamp   │
│   (Background Queue)   │      │   ASR Engine (int8)    │      │    Dialogue Script     │
└────────────────────────┘      └────────────────────────┘      └───────────┬────────────┘
                                                                            │
                                                                            ▼
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│ Neo-Brutalist React UI │ ◄─── │   SQLite Local DB      │ ◄─── │   Qwen 2.5 7B LLM      │
│  (Vite + TailwindCSS)  │      │   (Zero Cloud Relay)   │      │ (Local Ollama Engine)  │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

## 🛠️ Technology Stack

Parrot is built using a modern, lightweight technology stack designed for **local processing, performance, privacy, and reliability**.

| **Layer**              | **Technology**         | **Purpose**                                                            |
| ---------------------- | ---------------------- | ---------------------------------------------------------------------- |
| **Backend**            | FastAPI + Uvicorn      | High-performance asynchronous API with background job polling          |
| **Speech Recognition** | Faster-Whisper (int8)  | Multi-threaded CPU speech decoding with natural turn detection         |
| **AI Intelligence**    | Qwen 2.5 7B via Ollama | 128k context reasoning, strict JSON schema output, and task extraction |
| **Database**           | SQLite                 | Lightweight, persistent local database                                 |
| **Frontend**           | React 18 + Vite        | Responsive, tactile Neo-Brutalist interface                            |
| **Styling**            | Tailwind CSS           | High-contrast, brutalist aesthetic with accessible controls            |
| **Icons & UI**         | Lucide React           | Clean, scalable visual components                                      |

## 🚀 Getting Started

### ⚡ Quick Start — Windows

Launch Parrot locally with a single command. The included setup script handles virtual environment creation, package installation, model verification, and service launching automatically.

**1. Clone the repository**

```powershell
git clone https://github.com/a1ex-notfound/Parrot.git
cd Parrot
```

**2. Run the Master Launcher**

Double-click `run_app.bat` or run the following command in PowerShell:

```powershell
.\run_app.bat
```

The script will automatically:

- Verify your Python, Node.js, and Ollama installations.
- Create a virtual environment (`venv`) and install Python dependencies.
- Install frontend npm packages if needed.
- Start the Ollama background service and verify the `qwen2.5:7b` model (downloads automatically if not cached).
- Launch both the FastAPI backend and Vite frontend services.
- Open the application directly in your default browser.

**3. Open the Workspace**

Once initialized, navigate to:

[**http://localhost:5173**](http://localhost:5173)
