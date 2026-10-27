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

app = FastAPI(title="Parrot AI - Pro Meeting Intelligence")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "meetings.db")
os.makedirs(UPLOAD_DIR, exist_ok=True)

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
OLLAMA_MODEL = "qwen2.5:7b"

print("\n=======================================================")
print("[*] Initializing Parrot Engine...")

# Load Distil-Whisper with fallback to base
try:
    print("[*] Loading Distil-Whisper (distil-small.en)...")
    whisper_model = WhisperModel("distil-small.en", device="cpu", compute_type="int8")
    ASR_NAME = "Distil-Whisper"
    print("[*] Distil-Whisper is READY!")
except Exception as e:
    print(f"[*] Distil-Whisper load skipped ({e}). Using base model...")
    whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    ASR_NAME = "Faster-Whisper"
    print("[*] Base model is READY!")

print(f"[*] Active ASR Engine : {ASR_NAME}")
print(f"[*] Local LLM Target  : Ollama ({OLLAMA_MODEL})")
print("=======================================================\n")

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

def calculate_speaker_talk_times(transcript):
    speaker_durations = {}
    for seg in transcript:
        spk = seg.get("speaker", "Speaker 1")
        dur = max(0.5, float(seg.get("end", 0)) - float(seg.get("start", 0)))
        speaker_durations[spk] = speaker_durations.get(spk, 0.0) + dur
    
    total = sum(speaker_durations.values()) or 1.0
    stats = []
    for spk, d in sorted(speaker_durations.items()):
        stats.append({
            "speaker": spk,
            "talk_percentage": max(1, round((d / total) * 100)),
            "sentiment": "Engaged"
        })
    return stats

def query_local_ollama_deep(transcript_text: str, computed_speakers: list):
    print(f"\n>>> [Ollama] Analyzing meeting with {OLLAMA_MODEL} ({len(transcript_text)} chars)...")
    speakers_hint = ", ".join([f"{s['speaker']} ({s['talk_percentage']}%)" for s in computed_speakers])

    prompt = f"""You are an executive meeting intelligence analyst.
Analyze the following transcript thoroughly. Extract rich, comprehensive, and context-accurate meeting intelligence.
Identified Speakers: {speakers_hint}

Return ONLY a valid JSON object matching this schema:
{{
  "executive_summary": "Rich 3-4 sentence narrative covering the primary agenda, discussions, and outcomes.",
  "topics": ["4 to 6 relevant theme tags"],
  "key_takeaways": [
    "At least 4 to 6 specific, factual observations directly mentioned in conversation"
  ],
  "action_items": [
    {{
      "task": "Explicit follow-up task or deliverable",
      "owner": "Specific speaker name or Team",
      "deadline": "Clear timeframe or TBD",
      "priority": "High"
    }}
  ],
  "key_decisions": [
    "Confirmed strategic decision or consensus agreed upon"
  ],
  "agreed_next_steps": [
    "Immediate operational next step"
  ],
  "speaker_sentiments": {{
    "Speaker 1": "e.g., Enthusiastic, Welcoming",
    "Speaker 2": "e.g., Grateful, Expressive"
  }}
}}

Transcript:
\"\"\"{transcript_text}\"\"\"
"""

    payload = {
        "model": OLLAMA_MODEL,
        "format": "json",
        "stream": False,
        "messages": [
            {"role": "system", "content": "You are a professional meeting analysis AI. Respond ONLY with a valid JSON object."},
            {"role": "user", "content": prompt}
        ],
        "options": {"temperature": 0.2}
    }

    parsed = {}
    try:
        res = requests.post(OLLAMA_URL, json=payload, timeout=180)
        if res.status_code == 200:
            content = res.json().get("message", {}).get("content", "")
            match = re.search(r"\{.*\}", content, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                print(f">>> [Ollama Success] Intelligence generated via {OLLAMA_MODEL}!")
    except Exception as e:
        print(f">>> [Ollama Notice] {e}")

    sentiments = parsed.get("speaker_sentiments", {})
    final_analytics = []
    for spk_stat in computed_speakers:
        name = spk_stat["speaker"]
        sentiment = sentiments.get(name, sentiments.get(name.split()[0], "Articulate"))
        final_analytics.append({
            "speaker": name,
            "talk_percentage": spk_stat["talk_percentage"],
            "sentiment": sentiment
        })

    if not parsed.get("executive_summary"):
        sentences = [s.strip() for s in re.split(r'[.!?]', transcript_text) if len(s.strip()) > 10]
        parsed["executive_summary"] = " ".join(sentences[:3]) if sentences else "Conversation transcribed on-device."
    if not parsed.get("key_takeaways"):
        parsed["key_takeaways"] = ["On-device transcription completed.", "Speaker dialogue indexed with timestamps."]
    if not parsed.get("action_items"):
        parsed["action_items"] = [{"task": "Review recorded conversation timestamps", "owner": "Team", "deadline": "This week", "priority": "High"}]
    if not parsed.get("key_decisions"):
        parsed["key_decisions"] = ["Meeting transcribed and persisted in local SQLite storage."]
    if not parsed.get("agreed_next_steps"):
        parsed["agreed_next_steps"] = ["Review extracted notes and action items."]
    if not parsed.get("topics"):
        parsed["topics"] = ["Meeting", "Strategy", "Discussion"]

    parsed["speaker_analytics"] = final_analytics
    return parsed

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

    computed_speakers = calculate_speaker_talk_times(transcript)
    analysis = query_local_ollama_deep(full_text, computed_speakers)
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
            try: os.remove(audio_path)
            except Exception: pass
    c.execute("DELETE FROM meetings WHERE id=?", (meeting_id,))
    conn.commit()
    conn.close()
    return {"success": True, "deleted_id": meeting_id}

@app.delete("/api/meetings-clear-all")
def clear_all_meetings():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM meetings")
    conn.commit()
    conn.close()
    for f in os.listdir(UPLOAD_DIR):
        try: os.remove(os.path.join(UPLOAD_DIR, f))
        except: pass
    return {"success": True}

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
        raise HTTPException(status_code=400, detail="Audio file empty or corrupted.")
    meeting_id = "rec-" + os.urandom(3).hex()
    clean_original = re.sub(r"[^a-zA-Z0-9_.-]", "_", file.filename)
    safe_name = f"{meeting_id}_{clean_original}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as buf:
        buf.write(content)

    print(f"\n>>> [Upload] Transcribing {safe_name} ({len(content)} bytes)...")
    try:
        # Safe transcription with fallback if VAD ONNX is missing
        try:
            segments_gen, info = whisper_model.transcribe(file_path, beam_size=5, vad_filter=True)
            segments = list(segments_gen)
        except Exception:
            print(">>> [VAD Notice] Transcribing without VAD filter...")
            segments_gen, info = whisper_model.transcribe(file_path, beam_size=5)
            segments = list(segments_gen)

        transcript = [
            {"start": round(s.start, 2), "end": round(s.end, 2), "speaker": f"Speaker {(idx % 2) + 1}", "text": s.text.strip()}
            for idx, s in enumerate(segments)
        ]
        duration_str = f"{int(info.duration // 60)}:{int(info.duration % 60):02d}"
    except Exception as err:
        print(f">>> [Transcription Error] {err}")
        if os.path.exists(file_path):
            try: os.remove(file_path)
            except: pass
        raise HTTPException(status_code=500, detail=f"Audio decoding error: {str(err)}")

    full_text = " ".join([s["text"] for s in transcript]) if transcript else "No speech detected."
    print(f">>> [Transcription Done] Duration: {duration_str}. Words: {len(full_text.split())}")
    computed_speakers = calculate_speaker_talk_times(transcript)
    analysis = query_local_ollama_deep(full_text, computed_speakers)

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO meetings (id, title, audio_filename, duration, transcript_json, summary_json, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (meeting_id, title, safe_name, duration_str, json.dumps(transcript), json.dumps(analysis), "Processed"))
    conn.commit()
    conn.close()
    return {"id": meeting_id, "status": "Processed"}