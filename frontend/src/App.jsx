import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, Zap, HardDrive, Lock, Play, Pause, RotateCcw, 
  Upload, Sparkles, CheckCircle2, Clock, Users, FileText, 
  ChevronRight, Volume2, Plus, AlertCircle 
} from "lucide-react";

export default function App() {
  const [meetings, setMeetings] = useState([]);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeTab, setActiveTab] = useState("transcript");
  const [isUploading, setIsUploading] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/meetings");
      const data = await res.json();
      setMeetings(data);
      if (data.length > 0) {
        loadMeeting(data[0].id);
      }
    } catch (e) {
      console.log("Waiting for backend...");
    }
  };

  const loadMeeting = async (id) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/meetings/${id}`);
      const data = await res.json();
      setActiveMeeting(data);
      setCurrentTime(0);
      setIsPlaying(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateDemo = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/create-demo", { method: "POST" });
      const data = await res.json();
      await fetchMeetings();
      loadMeeting(data.id);
    } catch (e) {
      alert("Please make sure Backend is running on port 8000!");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

    try {
      const res = await fetch("http://127.0.0.1:8000/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      await fetchMeetings();
      loadMeeting(data.id);
    } catch (err) {
      alert("Error uploading audio. Check backend terminal.");
    } finally {
      setIsUploading(false);
    }
  };

  const seekTo = (seconds) => {
    setCurrentTime(seconds);
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-300">
      {/* Top Banner */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-lg shadow-lg shadow-amber-500/10">
            🦦
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-white text-lg">BLACKBOX AI</span>
              <span className="text-[10px] uppercase font-mono tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                100% On-Device
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">Faster-Whisper ASR • Gemma 4 via Ollama • Local SQLite</p>
          </div>
        </div>

        {/* System Badges & Actions */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center space-x-4 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="flex items-center text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 0 Cloud Uploads
            </span>
            <span className="text-zinc-600">|</span>
            <span className="flex items-center text-amber-400">
              <Lock className="w-3.5 h-3.5 mr-1" /> 100% Local
            </span>
          </div>

          <button 
            onClick={handleCreateDemo} 
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg font-medium transition flex items-center space-x-1.5 border border-zinc-700"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Load Demo Meeting</span>
          </button>

          <label className="text-xs bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-2 rounded-lg font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-amber-500/20">
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? "Transcribing..." : "Upload Audio"}</span>
            <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Meetings List */}
        <aside className="w-72 border-r border-zinc-800/80 bg-zinc-950/40 p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 px-1 uppercase tracking-wider">
            <span>Local Meetings ({meetings.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {meetings.map((m) => (
              <button
                key={m.id}
                onClick={() => loadMeeting(m.id)}
                className={`w-full text-left p-3 rounded-xl border transition group ${
                  activeMeeting?.id === m.id
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                    : "bg-zinc-900/50 border-zinc-800/60 hover:bg-zinc-800/50 text-zinc-300"
                }`}
              >
                <div className="font-semibold text-sm truncate group-hover:text-amber-400 transition">
                  {m.title}
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 font-mono">
                  <span>{m.duration || "Recorded"}</span>
                  <span className="text-emerald-400/80">{m.status || "Ready"}</span>
                </div>
              </button>
            ))}

            {meetings.length === 0 && (
              <div className="text-center p-6 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                No meetings recorded yet. Click "Load Demo Meeting" to see BlackBox AI in action!
              </div>
            )}
          </div>
        </aside>

        {/* Center / Right Content */}
        {activeMeeting ? (
          <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950/20">
            {/* Audio Waveform Scrubber Header */}
            <div className="border-b border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">{activeMeeting.title}</h1>
                  <p className="text-xs text-zinc-400 mt-0.5">Processed entirely in-memory with local privacy controls.</p>
                </div>

                {/* Speed Controls & Jump */}
                <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                  {[1, 1.25, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => changeSpeed(spd)}
                      className={`text-xs px-2.5 py-1 rounded font-mono font-medium transition ${
                        playbackSpeed === spd
                          ? "bg-amber-500 text-black font-bold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {spd}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrubber & Player */}
              <div className="mt-4 bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 flex items-center space-x-4">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center transition shadow-lg shadow-amber-500/20 flex-shrink-0"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                {/* Simulated Waveform Visualizer */}
                <div className="flex-1 flex items-center space-x-1 h-8 overflow-hidden">
                  {Array.from({ length: 48 }).map((_, idx) => {
                    const heightPercent = 20 + Math.sin(idx * 0.4) * 40 + (idx % 3) * 15;
                    const isPassed = (idx / 48) * 25 <= currentTime;
                    return (
                      <div
                        key={idx}
                        onClick={() => seekTo((idx / 48) * 25)}
                        style={{ height: `${heightPercent}%` }}
                        className={`flex-1 rounded-full cursor-pointer transition-colors ${
                          isPassed ? "bg-amber-400" : "bg-zinc-700/60 hover:bg-zinc-500"
                        }`}
                      />
                    );
                  })}
                </div>

                <div className="font-mono text-xs text-zinc-400 flex-shrink-0">
                  {Math.floor(currentTime)}s / {activeMeeting.duration || "0:25"}
                </div>
              </div>

              {/* Hidden HTML5 Audio Element for real playback */}
              <audio
                ref={audioRef}
                onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
                onEnded={() => setIsPlaying(false)}
                src={activeMeeting.audio_filename ? `http://127.0.0.1:8000/api/audio/${activeMeeting.audio_filename}` : undefined}
              />
            </div>

            {/* Split View: Transcript (Left) + AI Insights Matrix (Right) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              {/* Transcript Column (7 cols) */}
              <div className="lg:col-span-7 border-r border-zinc-800/80 flex flex-col overflow-hidden">
                <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center">
                    <FileText className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    Timestamped Diarized Transcript
                  </span>
                  <span className="text-[11px] text-zinc-500">Click any dialogue to seek audio</span>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {activeMeeting.transcript?.map((item, idx) => {
                    const isCurrent = currentTime >= item.start && currentTime <= item.end;
                    return (
                      <div
                        key={idx}
                        onClick={() => seekTo(item.start)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer ${
                          isCurrent
                            ? "bg-amber-500/10 border-amber-500/50 shadow-sm"
                            : "bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-xs text-amber-400/90">{item.speaker}</span>
                          <span className="font-mono text-[11px] text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded">
                            {item.start}s – {item.end}s
                          </span>
                        </div>
                        <p className="text-sm text-zinc-200 leading-relaxed">{item.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Intelligence Column: Gemma 4 via Ollama (5 cols) */}
              <div className="lg:col-span-5 flex flex-col overflow-hidden bg-zinc-950/40">
                <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    Gemma 4 Meeting Intelligence
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                    Local LLM
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {/* Executive Summary */}
                  <div>
                    <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-400 mb-2 font-semibold">
                      Executive Summary
                    </h3>
                    <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl text-sm leading-relaxed text-zinc-200">
                      {activeMeeting.analysis?.executive_summary || "No summary generated."}
                    </div>
                  </div>

                  {/* Action Items Matrix */}
                  <div>
                    <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-400 mb-2 font-semibold">
                      Action Items Matrix
                    </h3>
                    <div className="space-y-2">
                      {activeMeeting.analysis?.action_items?.map((act, i) => (
                        <div key={i} className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-xl flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-zinc-100">{act.task}</p>
                            <div className="flex items-center space-x-3 text-xs text-zinc-400">
                              <span>👤 {act.owner}</span>
                              <span>⏳ {act.deadline}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                            act.priority === "High" 
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {act.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Decisions */}
                  <div>
                    <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-400 mb-2 font-semibold">
                      Key Decisions Consensus
                    </h3>
                    <ul className="space-y-2">
                      {activeMeeting.analysis?.key_decisions?.map((dec, i) => (
                        <li key={i} className="flex items-start space-x-2 text-xs text-zinc-300 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800/60">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{dec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Speaker Talk-Time Distribution */}
                  <div>
                    <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-400 mb-2 font-semibold">
                      Speaker Talk-Time Distribution
                    </h3>
                    <div className="space-y-3 bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-800/60">
                      {activeMeeting.analysis?.speaker_analytics?.map((spk, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-zinc-300">{spk.speaker} ({spk.sentiment})</span>
                            <span className="text-amber-400 font-bold">{spk.talk_percentage}%</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full"
                              style={{ width: `${spk.talk_percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Topics Extracted */}
                  <div>
                    <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-400 mb-2 font-semibold">
                      Indexed Topics
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {activeMeeting.analysis?.topics?.map((topic, i) => (
                        <span key={i} className="text-xs bg-zinc-800 border border-zinc-700/60 text-zinc-300 px-2.5 py-1 rounded-md">
                          #{topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Select a meeting or load demo.
          </div>
        )}
      </div>
    </div>
  );
}
