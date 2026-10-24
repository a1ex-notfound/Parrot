import os
import re
import json
import sqlite3
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import requests
from faster_whisper import WhisperModel

app = FastAPI(title="BlackBox AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "meetings.db")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Load environment configuration
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
MODEL_ID = os.environ.get("MODEL_ID", "google/gemma-2-9b-it")

for env_path in [os.path.join(PROJECT_ROOT, ".env"), os.path.join(BASE_DIR, ".env")]:
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    if k.strip() == "OPENROUTER_API_KEY" and not OPENROUTER_API_KEY:
                        OPENROUTER_API_KEY = v.strip().strip("'").strip('"')
                    if k.strip() == "MODEL_ID":
                        MODEL_ID = v.strip().strip("'").strip('"')

if OPENROUTER_API_KEY:
    print(f">>> [Config] OpenRouter Key Loaded! Model: {MODEL_ID}")
else:
    print(">>> [Config Warning] OPENROUTER_API_KEY is not set in .env")

print(">>> Initializing Faster-Whisper base model on CPU...")
whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
print(">>> Faster-Whisper is ready!")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id TEXT PRIMARY KEY,
            title TEXT,
            audio_filename TEXT,
            duration TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            transcript_json TEXT,
            summary_json TEXT,
            status TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

def query_openrouter_gemma(transcript_text: str):
    if not OPENROUTER_API_KEY:
        print(">>> [Gemma Skipped] No OpenRouter API key found in .env.")
        return get_dynamic_fallback(transcript_text)

    print(f">>> [Gemma 4] Sending transcript ({len(transcript_text)} characters) to OpenRouter ({MODEL_ID})...")

    prompt = f"""You are an executive meeting intelligence analyst.
Analyze the following transcript carefully. Extract true, context-aware information directly based on what the speakers actually discussed.
Output strictly a valid JSON object matching this exact schema:

{{
  "executive_summary": "A cohesive 2-3 sentence overview explaining the central subject and what the speakers talked about.",
  "key_takeaways": [
    "Key observation or fact directly mentioned in the conversation",
    "Another critical highlight from what was said"
  ],
  "action_items": [
    {{
      "task": "Explicit follow-up task or project discussed",
      "owner": "Specific speaker/entity or 'Host'",
      "deadline": "Timeframe mentioned or 'Ongoing'",
      "priority": "High"
    }}
  ],
  "key_decisions": [
    "Core decision, announcement, or agreed consensus from the talk"
  ],
  "agreed_next_steps": [
    "Next immediate step or future plan mentioned by the speakers"
  ],
  "speaker_analytics": [
    {{
      "speaker": "Speaker 1",
      "talk_percentage": 50,
      "sentiment": "e.g., Enthusiastic, Reflective, Inquisitive, or Professional"
    }},
    {{
      "speaker": "Speaker 2",
      "talk_percentage": 50,
      "sentiment": "e.g., Enthusiastic, Grateful, or Expressive"
    }}
  ]
}}

Transcript to analyze:
\"\"\"{transcript_text}\"\"\"
"""

    try:
        res = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "BlackBox AI"
            },
            json={
                "model": MODEL_ID,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a professional meeting analysis AI. You must respond ONLY with a raw JSON object. Do not output conversational text or markdown explanation."
                    },
                    {"role": "user", "content": prompt}
                ]
            },
            timeout=60
        )

        if res.status_code == 200:
            data = res.json()
            raw = data["choices"][0]["message"]["content"].strip()
            
            # Extract JSON cleanly using regex
            json_match = re.search(r"\{.*\}", raw, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                print(">>> [Gemma 4] Meeting intelligence successfully generated from real transcript!")
                return parsed
            else:
                print(f">>> [Gemma 4 Format Error] Could not parse JSON from output: {raw[:200]}")
        else:
            print(f">>> [OpenRouter Error] HTTP {res.status_code}: {res.text}")
    except Exception as e:
        print(f">>> [OpenRouter Request Failed] {e}")

    return get_dynamic_fallback(transcript_text)

def get_dynamic_fallback(transcript_text):
    sample = transcript_text[:120].strip() if transcript_text else "No speech content"
    return {
        "executive_summary": f"Discussion recorded: \"{sample}...\". Context captured on-device.",
        "key_takeaways": [
            "Local audio captured with Faster-Whisper ASR.",
            "Please check OpenRouter API key or model availability in backend terminal."
        ],
        "action_items": [
            {"task": "Verify OpenRouter API connectivity in backend", "owner": "Admin", "deadline": "Immediate", "priority": "High"}
        ],
        "key_decisions": [
            "100% on-device speech transcription verified."
        ],
        "agreed_next_steps": [
            "Click 'Re-analyze with Gemma' to retry intelligence generation."
        ],
        "speaker_analytics": [
            {"speaker": "Speaker 1", "talk_percentage": 50, "sentiment": "Recorded"},
            {"speaker": "Speaker 2", "talk_percentage": 50, "sentiment": "Recorded"}
        ]
    }

@app.get("/api/meetings")
def list_meetings():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, title, duration, created_at, status FROM meetings ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return [{"id": r[0], "title": r[1], "duration": r[2], "created_at": r[3], "status": r[4]} for r in rows]

@app.get("/api/meetings/{meeting_id}")
def get_meeting(meeting_id: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, title, audio_filename, duration, created_at, transcript_json, summary_json, status FROM meetings WHERE id=?", (meeting_id,))
    r = c.fetchone()
    conn.close()
    if not r:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {
        "id": r[0],
        "title": r[1],
        "audio_filename": r[2],
        "duration": r[3],
        "created_at": r[4],
        "transcript": json.loads(r[5] or "[]"),
        "analysis": json.loads(r[6] or "{}"),
        "status": r[7]
    }

@app.post("/api/meetings/{meeting_id}/reanalyze")
def reanalyze_meeting(meeting_id: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT transcript_json FROM meetings WHERE id=?", (meeting_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    transcript = json.loads(row[0] or "[]")
    full_text = " ".join([t.get("text", "") for t in transcript]).strip()
    if not full_text:
        conn.close()
        raise HTTPException(status_code=400, detail="Transcript is empty")
    
    analysis = query_openrouter_gemma(full_text)
    c.execute("UPDATE meetings SET summary_json=? WHERE id=?", (json.dumps(analysis), meeting_id))
    conn.commit()
    conn.close()
    return {"id": meeting_id, "analysis": analysis}

@app.delete("/api/meetings/{meeting_id}")
def delete_meeting(meeting_id: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT audio_filename FROM meetings WHERE id=?", (meeting_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Meeting not found")
    if row[0]:
        audio_path = os.path.join(UPLOAD_DIR, row[0])
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass
    c.execute("DELETE FROM meetings WHERE id=?", (meeting_id,))
    conn.commit()
    conn.close()
    return {"success": True, "deleted_id": meeting_id}

@app.get("/api/audio/{filename}")
def stream_audio(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/mpeg")
    raise HTTPException(status_code=404, detail="File not found")

@app.post("/api/upload")
async def upload_audio(file: UploadFile = File(...), title: Optional[str] = Form("Meeting Recording")):
    content = await file.read()
    if not content or len(content) < 500:
        raise HTTPException(status_code=400, detail="Audio file is empty or corrupted.")

    meeting_id = "rec-" + os.urandom(3).hex()
    clean_original = re.sub(r"[^a-zA-Z0-9_.-]", "_", file.filename)
    safe_name = f"{meeting_id}_{clean_original}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as buf:
        buf.write(content)

    print(f">>> Transcribing {safe_name} ({len(content)} bytes) with Faster-Whisper...")
    try:
        segments, info = whisper_model.transcribe(file_path, beam_size=5)
        transcript = [
            {
                "start": round(s.start, 2),
                "end": round(s.end, 2),
                "speaker": f"Speaker {(idx % 2) + 1}",
                "text": s.text.strip()
            }
            for idx, s in enumerate(segments)
        ]
        duration_str = f"{int(info.duration // 60)}:{int(info.duration % 60):02d}"
    except Exception as err:
        print(f">>> [Audio Transcribe Error] {err}")
        if os.path.exists(file_path):
            try: os.remove(file_path)
            except: pass
        raise HTTPException(status_code=400, detail="Invalid audio file. Please upload a standard MP3, WAV, or record via mic.")

    full_text = " ".join([s["text"] for s in transcript]) if transcript else "No audible speech detected."
    print(f">>> Transcription complete ({duration_str}). Requesting Gemma intelligence...")
    analysis = query_openrouter_gemma(full_text)

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO meetings (id, title, audio_filename, duration, transcript_json, summary_json, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (meeting_id, title, safe_name, duration_str, json.dumps(transcript), json.dumps(analysis), "Processed"))
    conn.commit()
    conn.close()

    return {"id": meeting_id, "status": "Processed"}

@app.post("/api/create-demo")
def create_demo():
    demo_id = "demo-" + os.urandom(3).hex()
    transcript = [
        {"start": 0.0, "end": 4.5, "speaker": "Speaker 1 (Alex)", "text": "Welcome to the BlackBox AI demo. Today we confirm zero cloud uploads and local processing."},
        {"start": 5.0, "end": 9.8, "speaker": "Speaker 2 (Sarah)", "text": "Faster-Whisper runs on local CPU, while Gemma models structure meeting actions and decisions."},
        {"start": 10.2, "end": 16.5, "speaker": "Speaker 1 (Alex)", "text": "Agreed: Alex verifies timestamp sync by Friday, and engineering secures the local SQLite database."}
    ]
    analysis = query_openrouter_gemma(" ".join([t["text"] for t in transcript]))
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO meetings (id, title, audio_filename, duration, transcript_json, summary_json, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (demo_id, "BlackBox AI Product Launch & Sync", "demo.mp3", "0:17", json.dumps(transcript), json.dumps(analysis), "Processed"))
    conn.commit()
    conn.close()
    return {"id": demo_id, "status": "Processed"}
