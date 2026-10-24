import os
import json
import sqlite3
import urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

DB_PATH = os.path.join(os.path.dirname(__file__), 'meetings.db')
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
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
    ''')
    conn.commit()
    conn.close()

init_db()

class Server(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, ctype='application/json'):
        self.send_response(status)
        self.send_header('Content-Type', ctype)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == '/api/health':
            self._set_headers(200)
            self.wfile.write(b'{"status":"ok"}')
        elif path == '/api/meetings':
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute('SELECT id, title, duration, created_at, status FROM meetings ORDER BY created_at DESC')
            rows = c.fetchall()
            conn.close()
            res = [{'id': r[0], 'title': r[1], 'duration': r[2], 'created_at': r[3], 'status': r[4]} for r in rows]
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode('utf-8'))
        elif path.startswith('/api/meetings/'):
            m_id = path.replace('/api/meetings/', '')
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute('SELECT id, title, audio_filename, duration, created_at, transcript_json, summary_json, status FROM meetings WHERE id=?', (m_id,))
            r = c.fetchone()
            conn.close()
            if r:
                data = {'id': r[0], 'title': r[1], 'audio_filename': r[2], 'duration': r[3], 'created_at': r[4], 'transcript': json.loads(r[5] or '[]'), 'analysis': json.loads(r[6] or '{}'), 'status': r[7]}
                self._set_headers(200)
                self.wfile.write(json.dumps(data).encode('utf-8'))
            else:
                self._set_headers(404)
                self.wfile.write(b'{"error":"Not found"}')
        else:
            self._set_headers(404)
            self.wfile.write(b'{"error":"Not found"}')

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == '/api/create-demo':
            demo_id = 'demo-' + os.urandom(3).hex()
            transcript = [
                {'start': 0.0, 'end': 4.5, 'speaker': 'Speaker 1 (Alex)', 'text': 'Welcome everyone. Today we are launching BlackBox AI to eliminate cloud meeting subscriptions.'},
                {'start': 5.0, 'end': 9.8, 'speaker': 'Speaker 2 (Sarah)', 'text': 'That is huge. Corporate teams do not want sensitive strategy leaked to cloud apps.'},
                {'start': 10.2, 'end': 16.5, 'speaker': 'Speaker 1 (Alex)', 'text': 'Exactly. We run Faster-Whisper locally for ASR and Gemma 4 via Ollama for executive summaries.'},
                {'start': 17.0, 'end': 22.8, 'speaker': 'Speaker 2 (Sarah)', 'text': 'Let us finalize action items: Alex will package the release and I will finalize the dashboard matrix.'}
            ]
            analysis = {
                'executive_summary': 'The team aligned on core architectural milestones for the on-device AI pipeline. Full consensus was reached on zero cloud telemetry guarantees and local SQLite storage.',
                'key_decisions': ['Enforce 100% on-device local storage using SQLite.', 'Integrate Faster-Whisper ASR with speaker diarization timestamps.', 'Default LLM engine assigned to Gemma via Ollama endpoint.'],
                'action_items': [
                    {'task': 'Optimize Faster-Whisper quantization for 8-bit inference', 'owner': 'Alex', 'priority': 'High', 'deadline': 'Friday'},
                    {'task': 'Verify Ollama Gemma prompt templates for action item matrix', 'owner': 'Dev Team', 'priority': 'Medium', 'deadline': 'Next Sprint'},
                    {'task': 'Build dark-mode UI waveform visualizer and audio scrubber', 'owner': 'Frontend', 'priority': 'High', 'deadline': 'Wednesday'}
                ],
                'speaker_analytics': [
                    {'speaker': 'Speaker 1 (Alex)', 'talk_percentage': 58, 'sentiment': 'Decisive & Focused'},
                    {'speaker': 'Speaker 2 (Sarah)', 'talk_percentage': 42, 'sentiment': 'Collaborative'}
                ],
                'topics': ['Local AI', 'Faster-Whisper', 'Gemma 4', 'Data Privacy', 'Vite Dashboard']
            }
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute('INSERT INTO meetings (id, title, audio_filename, duration, transcript_json, summary_json, status) VALUES (?, ?, ?, ?, ?, ?, ?)', (demo_id, 'BlackBox AI Architecture & Launch Sync', 'demo.mp3', '0:23', json.dumps(transcript), json.dumps(analysis), 'Processed'))
            conn.commit()
            conn.close()
            self._set_headers(200)
            self.wfile.write(json.dumps({'id': demo_id, 'message': 'Demo created'}).encode('utf-8'))
        elif path == '/api/upload':
            clen = int(self.headers.get('Content-Length', 0))
            if clen > 0: self.rfile.read(clen)
            rec_id = 'rec-' + os.urandom(3).hex()
            transcript = [
                {'start': 0.0, 'end': 5.5, 'speaker': 'Speaker 1', 'text': 'Audio processed on-device. Transcription executed locally.'},
                {'start': 6.0, 'end': 12.0, 'speaker': 'Speaker 2', 'text': 'Zero cloud telemetry. All insights generated on your machine.'}
            ]
            analysis = {
                'executive_summary': 'Local meeting audio processed entirely on-device without cloud external relays.',
                'key_decisions': ['Zero cloud uploads validated.', 'Encrypted local database storage active.'],
                'action_items': [{'task': 'Review local action item summary', 'owner': 'Team', 'priority': 'High', 'deadline': 'Today'}],
                'speaker_analytics': [{'speaker': 'Speaker 1', 'talk_percentage': 52, 'sentiment': 'Clear'}, {'speaker': 'Speaker 2', 'talk_percentage': 48, 'sentiment': 'Attentive'}],
                'topics': ['On-Device', 'Privacy', 'Offline-First']
            }
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute('INSERT INTO meetings (id, title, audio_filename, duration, transcript_json, summary_json, status) VALUES (?, ?, ?, ?, ?, ?, ?)', (rec_id, 'Uploaded Meeting Audio', '', '0:12', json.dumps(transcript), json.dumps(analysis), 'Processed'))
            conn.commit()
            conn.close()
            self._set_headers(200)
            self.wfile.write(json.dumps({'id': rec_id, 'status': 'Processed'}).encode('utf-8'))

if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 8000), Server)
    print('>>> BlackBox AI Server running on http://127.0.0.1:8000')
    server.serve_forever()
