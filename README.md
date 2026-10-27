<div align="center">

# 🦜 PARROT

### **100% On-Device Meeting Intelligence Platform**

*Say goodbye to expensive cloud subscriptions like Otter.ai, Fireflies.ai, and Read.ai.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Whisper](https://img.shields.io/badge/Faster_Whisper-FF6F00?style=for-the-badge&logo=openai&logoColor=white)](https://github.com/SYSTRAN/faster-whisper)
[![Ollama](https://img.shields.io/badge/Ollama_Gemma_4-000000?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.ai/)

---

### 🛡️ **Zero Cloud Uploads** • ⚡ **Real-Time Speed** • 🔒 **100% Data Ownership** • 0️⃣ **$0 Subscriptions**

</div>

<br />

## 🌟 Why Parrot?

Most meeting assistant apps store your sensitive corporate conversations on external servers and charge heavy monthly fees. **Parrot** runs **100% locally on your machine**. Powered by **Faster-Whisper** and **Gemma 4 via Ollama**, it brings local AI power to your meeting notes without sacrificing privacy.

---

## 🔥 Key Features

* **🎙️ Audio Processing & Seeking**
  * Upload or record meeting audio in seconds.
  * Interactive **waveform visualization** with custom playback speed controls ($1\times, 1.25\times, 1.5\times, 2\times$).
  * Click any segment in the transcript to instantly jump to that point in the audio.

* **🗣️ Speaker Diarization & Transcription**
  * Automatic speaker separation and identification.
  * Accurate, timestamped transcript generation using local Whisper models.

* **🧠 AI-Powered Insights (Gemma 4)**
  * **Executive Summaries**: High-level key takeaways generated instantly.
  * **Action Items Matrix**: Tasks categorized by owner, priority (High/Medium/Low), and deadlines.
  * **Key Decisions**: Clear highlight of consensus points.
  * **Speaker Analytics**: Talk-time distribution and sentiment metrics.
  * **Topic Extraction**: Core themes indexed for fast searching.

* **🛡️ Privacy First, Always**
  * Zero telemetry. Zero external servers. Total data encryption at rest.

---

## 🏗️ Architecture & Data Flow

```text
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│    Audio Upload    │ ──► │   Faster-Whisper   │ ──► │    Timestamped     │
│    or Recording    │     │     ASR Engine     │     │     Transcript     │
└────────────────────┘     └────────────────────┘     ─────────┬───────────┘
                                                               │
                                                               ▼
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│  React + Tailwind  │ ◄── │   SQLite DB Local  │ ◄── │     Gemma 4 AI     │
│     Dashboard      │     │      Storage       │     │    (via Ollama)    │
└────────────────────┘     └────────────────────┘     └────────────────────┘
```

## 🛠️ Technology Stack

Parrot is built using a modern, lightweight technology stack designed for **local processing, performance, privacy, and reliability**.

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | FastAPI | High-performance API and application logic |
| **Speech Recognition** | faster-whisper | Efficient audio transcription with CPU/GPU acceleration |
| **AI Intelligence** | Gemma 4 + Ollama | Local meeting summaries, decision extraction, and action items |
| **Database** | SQLite | Lightweight, persistent local storage |
| **Frontend** | React 18 + TypeScript + Vite | Responsive, type-safe user interface |
| **Styling** | Tailwind CSS | Clean, modern, utility-first UI design |
| **Icons & Audio** | Lucide + Web Audio API | Interface icons and audio visualization |

---

## 🚀 Getting Started

### ⚡ Quick Start — Windows

Launch Parrot locally with a single command.

**1. Clone or download the project**

Open a terminal in the project directory.

**2. Start the application**

Run the following command in PowerShell:

```powershell
.\run_app.bat
```

The launch script automatically sets up the Python virtual environment, installs the required dependencies when needed, starts the backend and frontend services, and opens the application in your browser.

**3. Start exploring**

Once the services are running, access the application at:

**http://localhost:5173**

> **Note:** The first launch may take longer while dependencies are installed. Real transcription and AI analysis require the relevant Whisper model and Ollama model to be available locally. Parrot's demo mode is designed to provide a quick demonstration without requiring the complete AI pipeline.
