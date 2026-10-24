import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, Upload, Sparkles, CheckCircle2, 
  FileText, Trash2, ArrowRightCircle, ListChecks, Mic, Square, 
  Lightbulb, UserCheck, Clock, Plus, Folder, Hash, ArrowUpRight
} from "lucide-react";

export default function App() {
  const [meetings, setMeetings] = useState([]);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Microphone recording
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/meetings");
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
        if (data.length > 0 && !activeMeeting) {
          loadMeeting(data[0].id);
        }
      }
    } catch (e) {
      console.log("Waiting for backend...");
    }
  };

  const loadMeeting = async (id) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/meetings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveMeeting(data);
        setCurrentTime(0);
        setIsPlaying(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMeeting = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this meeting record permanently?")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/meetings/${id}`, { method: "DELETE" });
      if (res.ok) {
        const remaining = meetings.filter((m) => m.id !== id);
        setMeetings(remaining);
        if (activeMeeting?.id === id) {
          if (remaining.length > 0) loadMeeting(remaining[0].id);
          else setActiveMeeting(null);
        }
      }
    } catch (err) {
      alert("Failed to delete meeting.");
    }
  };

  const handleCreateDemo = async () => {
    try {
      setIsProcessing(true);
      const res = await fetch("http://127.0.0.1:8000/api/create-demo", { method: "POST" });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(text || "Backend error"); }
      if (!res.ok) throw new Error(data.detail || "Demo creation failed");
      await fetchMeetings();
      loadMeeting(data.id);
    } catch (e) {
      alert("Demo error: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

    try {
      const res = await fetch("http://127.0.0.1:8000/api/upload", {
        method: "POST",
        body: formData,
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(text || `Error ${res.status}`); }
      if (!res.ok) throw new Error(data.detail || "Upload error");
      await fetchMeetings();
      loadMeeting(data.id);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `mic_record_${Date.now()}.webm`, { type: "audio/webm" });
        setIsProcessing(true);

        const formData = new FormData();
        formData.append("file", audioFile);
        formData.append("title", "Live Mic Recording");

        try {
          const res = await fetch("http://127.0.0.1:8000/api/upload", {
            method: "POST",
            body: formData,
          });
          const text = await res.text();
          let data;
          try { data = JSON.parse(text); } catch { throw new Error(text || "Server error"); }
          if (!res.ok) throw new Error(data.detail || "Upload error");
          await fetchMeetings();
          loadMeeting(data.id);
        } catch (err) {
          alert("Recording process error: " + err.message);
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied or not found.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
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
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) audioRef.current.playbackRate = speed;
  };

  const analysis = activeMeeting?.analysis || {};

  // Color mapping for collection folder tabs
  const folderColors = [
    { bg: "bg-[#4ADE80]", border: "border-black", text: "text-black" }, // Mint Green
    { bg: "bg-[#F472B6]", border: "border-black", text: "text-black" }, // Pink
    { bg: "bg-[#C084FC]", border: "border-black", text: "text-black" }, // Purple
    { bg: "bg-[#FDE047]", border: "border-black", text: "text-black" }, // Yellow
    { bg: "bg-[#38BDF8]", border: "border-black", text: "text-black" }, // Sky
  ];

  return (
    <div className="min-h-screen bg-[#FEF08A] text-black font-sans selection:bg-black selection:text-[#FEF08A] p-4 md:p-6 lg:p-8 flex flex-col relative overflow-x-hidden">
      
      {/* Decorative Neo-Brutalist Background Elements */}
      <div className="absolute top-12 left-[-40px] w-32 h-32 rounded-full bg-[#F472B6] border-[3px] border-black -z-10 pointer-events-none" />
      <div className="absolute bottom-16 right-[-20px] w-48 h-64 rounded-3xl bg-[#C084FC] border-[3px] border-black -z-10 pointer-events-none" />

      {/* Main Neo-Brutalist Container Canvas */}
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
        
        {/* Top Navbar Card */}
        <header className="bg-white border-[3px] border-black rounded-2xl shadow-[5px_5px_0px_#000] p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-[#FDE047] border-[2.5px] border-black flex items-center justify-center font-black text-2xl shadow-[3px_3px_0px_#000]">
              🦦
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none uppercase">BLACKBOX AI</h1>
              <p className="text-[11px] font-bold text-zinc-600 mt-1 uppercase tracking-wider">Privacy-First Meeting Intelligence</p>
            </div>
          </div>

          {/* Action Buttons with Neo-Brutalist Pop */}
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isProcessing}
                className="bg-[#FDA4AF] hover:bg-[#FB7185] text-black border-[2.5px] border-black px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center space-x-1.5"
              >
                <Mic className="w-4 h-4"/>
                <span>Record Mic</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="bg-red-500 text-white border-[2.5px] border-black px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] animate-pulse flex items-center space-x-1.5"
              >
                <Square className="w-4 h-4 fill-current"/>
                <span>Stop & Transcribe</span>
              </button>
            )}

            <button
              onClick={handleCreateDemo}
              disabled={isProcessing}
              className="bg-[#DDD6FE] hover:bg-[#C4B5FD] text-black border-[2.5px] border-black px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4"/>
              <span>Load Demo</span>
            </button>

            <label className="bg-[#FDE047] hover:bg-[#FACC15] text-black border-[2.5px] border-black px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center space-x-1.5 cursor-pointer">
              <Upload className="w-4 h-4"/>
              <span>{isProcessing ? "Processing..." : "Upload Audio"}</span>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="audio/*" 
                className="hidden" 
                onChange={handleFileUpload} 
                disabled={isProcessing} 
              />
            </label>
          </div>
        </header>

        {/* Hero Title - Inspired by Tuckii "Save now. Find anytime." */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-black">
              Listen now.<br />Decide anytime.
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-white border-[2.5px] border-black rounded-xl px-3 py-1.5 text-xs font-black uppercase shadow-[3px_3px_0px_#000]">
              🔒 100% On-Device Whisper
            </span>
            <span className="bg-[#4ADE80] border-[2.5px] border-black rounded-xl px-3 py-1.5 text-xs font-black uppercase shadow-[3px_3px_0px_#000]">
              ⚡ OpenRouter Gemma 4
            </span>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Tuckii-style Folder Collection Cards (Local Meetings) */}
          <aside className="lg:col-span-4 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-tight flex items-center">
                <Folder className="w-5 h-5 mr-1.5"/>
                My Meetings ({meetings.length})
              </h3>
            </div>

            <div className="space-y-3.5 max-h-[750px] overflow-y-auto pr-1">
              {meetings.map((m, idx) => {
                const colorScheme = folderColors[idx % folderColors.length];
                const isActive = activeMeeting?.id === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => loadMeeting(m.id)}
                    className={`relative cursor-pointer transition-all ${
                      isActive ? "translate-x-1 -translate-y-1" : "hover:-translate-y-0.5"
                    }`}
                  >
                    {/* Top Folder Tab */}
                    <div className="flex items-end pl-3">
                      <div className={`h-4 w-24 ${colorScheme.bg} border-t-[2.5px] border-l-[2.5px] border-r-[2.5px] border-black rounded-t-lg`} />
                    </div>

                    {/* Card Body */}
                    <div className={`bg-white border-[2.5px] border-black rounded-2xl p-4 shadow-[4px_4px_0px_#000] ${
                      isActive ? "ring-2 ring-black bg-[#FFFBEB]" : ""
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-xl ${colorScheme.bg} border-[2px] border-black flex items-center justify-center font-black shadow-[2px_2px_0px_#000]`}>
                            <FileText className="w-4 h-4"/>
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-black leading-snug line-clamp-1">
                              {m.title}
                            </h4>
                            <p className="text-[11px] font-bold text-zinc-500 font-mono mt-0.5">
                              {m.duration || "Recorded"} • {m.status || "Ready"}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleDeleteMeeting(e, m.id)}
                          className="hover:bg-rose-100 text-zinc-500 hover:text-rose-600 p-1.5 rounded-lg border border-transparent hover:border-black transition"
                          title="Delete meeting"
                        >
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {meetings.length === 0 && (
                <div className="bg-white border-[2.5px] border-dashed border-black rounded-2xl p-6 text-center shadow-[4px_4px_0px_#000]">
                  <p className="font-bold text-sm text-zinc-700">No meeting recordings found.</p>
                  <p className="text-xs text-zinc-500 mt-1">Click "Load Demo" or "Record Mic" to test!</p>
                </div>
              )}
            </div>
          </aside>

          {/* Right Column: Audio Scrubber, Transcript & Gemma 4 Insights */}
          <main className="lg:col-span-8 flex flex-col space-y-6">
            {activeMeeting ? (
              <>
                {/* Neo-Brutalist Audio Player Bar */}
                <div className="bg-white border-[3px] border-black rounded-2xl shadow-[5px_5px_0px_#000] p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-[2px] border-black">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-[#FDE047] border-[1.5px] border-black px-2 py-0.5 rounded-md shadow-[1.5px_1.5px_0px_#000]">
                        Active Intelligence File
                      </span>
                      <h3 className="text-xl font-black text-black tracking-tight mt-1">{activeMeeting.title}</h3>
                    </div>

                    {/* Speed Selector Pills */}
                    <div className="flex items-center space-x-1.5 bg-[#FEF08A] border-[2px] border-black rounded-xl p-1 shadow-[2px_2px_0px_#000]">
                      {[1, 1.25, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => changeSpeed(spd)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-black font-mono transition ${
                            playbackSpeed === spd
                              ? "bg-black text-[#FDE047]"
                              : "text-black hover:bg-white"
                          }`}
                        >
                          {spd}×
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scrubber & Waveform */}
                  <div className="mt-4 flex items-center space-x-4">
                    <button
                      onClick={togglePlay}
                      className="w-12 h-12 rounded-xl bg-[#FDE047] hover:bg-[#FACC15] text-black border-[2.5px] border-black flex items-center justify-center font-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition flex-shrink-0"
                    >
                      {isPlaying ? <Pause className="w-6 h-6 fill-current"/> : <Play className="w-6 h-6 fill-current ml-0.5"/>}
                    </button>

                    <div className="flex-1 flex items-center space-x-1 h-10 bg-zinc-50 border-[2px] border-black rounded-xl px-3 overflow-hidden shadow-[2px_2px_0px_#000]">
                      {Array.from({ length: 44 }).map((_, idx) => {
                        const height = 25 + Math.sin(idx * 0.45) * 45 + (idx % 3) * 15;
                        const isPassed = (idx / 44) * 25 <= currentTime;
                        return (
                          <div
                            key={idx}
                            onClick={() => seekTo((idx / 44) * 25)}
                            style={{ height: `${Math.min(height, 90)}%` }}
                            className={`flex-1 rounded-sm cursor-pointer transition-all ${
                              isPassed ? "bg-black" : "bg-zinc-300 hover:bg-zinc-400"
                            }`}
                          />
                        );
                      })}
                    </div>

                    <div className="font-mono font-black text-xs bg-white border-[2px] border-black px-2.5 py-1.5 rounded-lg shadow-[2px_2px_0px_#000] flex-shrink-0">
                      {Math.floor(currentTime)}s / {activeMeeting.duration || "0:25"}
                    </div>
                  </div>

                  <audio
                    ref={audioRef}
                    onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
                    onEnded={() => setIsPlaying(false)}
                    src={activeMeeting.audio_filename ? `http://127.0.0.1:8000/api/audio/${activeMeeting.audio_filename}` : undefined}
                  />
                </div>

                {/* Split: Transcript (Left) + Gemma Intelligence (Right) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Folder Card: Timestamped Transcript */}
                  <div className="flex flex-col">
                    <div className="flex items-end pl-3">
                      <div className="h-4 w-28 bg-[#38BDF8] border-t-[2.5px] border-l-[2.5px] border-r-[2.5px] border-black rounded-t-lg" />
                    </div>

                    <div className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[5px_5px_0px_#000] flex-1 flex flex-col">
                      <div className="flex items-center justify-between pb-3 border-b-[2px] border-black mb-4">
                        <span className="font-black text-sm uppercase flex items-center">
                          <FileText className="w-4 h-4 mr-1.5 text-black"/>
                          Diarized Transcript
                        </span>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Click text to seek</span>
                      </div>

                      <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                        {activeMeeting.transcript?.map((item, idx) => {
                          const isCurrent = currentTime >= item.start && currentTime <= item.end;
                          return (
                            <div
                              key={idx}
                              onClick={() => seekTo(item.start)}
                              className={`p-3 rounded-xl border-[2px] border-black cursor-pointer transition-all ${
                                isCurrent
                                  ? "bg-[#FEF08A] shadow-[3px_3px_0px_#000] translate-x-1"
                                  : "bg-white hover:bg-zinc-50 shadow-[2px_2px_0px_#000]"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-black text-xs uppercase tracking-wider">{item.speaker}</span>
                                <span className="font-mono text-[10px] font-bold bg-white border border-black px-1.5 py-0.2 rounded">
                                  {item.start}s – {item.end}s
                                </span>
                              </div>
                              <p className="text-xs font-medium text-zinc-900 leading-relaxed">{item.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Folder Card: Gemma 4 Meeting Intelligence */}
                  <div className="flex flex-col space-y-6">
                    
                    {/* Executive Summary & Takeaways */}
                    <div>
                      <div className="flex items-end pl-3">
                        <div className="h-4 w-32 bg-[#F472B6] border-t-[2.5px] border-l-[2.5px] border-r-[2.5px] border-black rounded-t-lg" />
                      </div>
                      <div className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[5px_5px_0px_#000] space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b-[2px] border-black">
                          <span className="font-black text-sm uppercase flex items-center">
                            <Sparkles className="w-4 h-4 mr-1.5 text-black"/>
                            Executive Summary
                          </span>
                        </div>
                        <p className="text-xs font-semibold leading-relaxed text-zinc-800">
                          {analysis.executive_summary || "No executive summary available."}
                        </p>

                        {analysis.key_takeaways?.length > 0 && (
                          <div className="pt-2 border-t-[1.5px] border-zinc-300 space-y-2">
                            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Key Highlights</span>
                            {analysis.key_takeaways.map((point, idx) => (
                              <div key={idx} className="flex items-start space-x-2 text-xs font-medium text-zinc-900 bg-[#F3F4F6] border border-black p-2 rounded-lg">
                                <span className="font-black text-black">•</span>
                                <span>{point}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Items Matrix */}
                    <div>
                      <div className="flex items-end pl-3">
                        <div className="h-4 w-28 bg-[#FDE047] border-t-[2.5px] border-l-[2.5px] border-r-[2.5px] border-black rounded-t-lg" />
                      </div>
                      <div className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[5px_5px_0px_#000] space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b-[2px] border-black">
                          <span className="font-black text-sm uppercase flex items-center">
                            <ListChecks className="w-4 h-4 mr-1.5 text-black"/>
                            Action Items Matrix
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {analysis.action_items?.map((act, i) => (
                            <div key={i} className="bg-white border-[2px] border-black p-3 rounded-xl shadow-[2.5px_2.5px_0px_#000] space-y-1.5">
                              <p className="text-xs font-black text-black">{act.task}</p>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold">
                                <span className="bg-[#FEF08A] border border-black px-2 py-0.5 rounded">👤 {act.owner || "Unassigned"}</span>
                                <span className="bg-zinc-100 border border-black px-2 py-0.5 rounded">⏳ {act.deadline || "TBD"}</span>
                                <span className="bg-[#FDA4AF] border border-black px-2 py-0.5 rounded uppercase">📌 {act.priority || "High"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Key Decisions & Agreed Next Steps */}
                    <div>
                      <div className="flex items-end pl-3">
                        <div className="h-4 w-32 bg-[#4ADE80] border-t-[2.5px] border-l-[2.5px] border-r-[2.5px] border-black rounded-t-lg" />
                      </div>
                      <div className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[5px_5px_0px_#000] space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b-[2px] border-black">
                          <span className="font-black text-sm uppercase flex items-center">
                            <CheckCircle2 className="w-4 h-4 mr-1.5 text-black"/>
                            Decisions & Next Steps
                          </span>
                        </div>

                        <div className="space-y-2">
                          {analysis.key_decisions?.map((dec, i) => (
                            <div key={i} className="flex items-start space-x-2 text-xs font-bold text-zinc-900 bg-[#DCFCE7] border-[1.5px] border-black p-2 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5"/>
                              <span>{dec}</span>
                            </div>
                          ))}
                          {analysis.agreed_next_steps?.map((step, i) => (
                            <div key={i} className="flex items-start space-x-2 text-xs font-bold text-zinc-900 bg-[#E0F2FE] border-[1.5px] border-black p-2 rounded-lg">
                              <ArrowRightCircle className="w-3.5 h-3.5 text-sky-700 flex-shrink-0 mt-0.5"/>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Speaker Sentiment & Talk-Time */}
                    <div>
                      <div className="flex items-end pl-3">
                        <div className="h-4 w-28 bg-[#C084FC] border-t-[2.5px] border-l-[2.5px] border-r-[2.5px] border-black rounded-t-lg" />
                      </div>
                      <div className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[5px_5px_0px_#000] space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b-[2px] border-black">
                          <span className="font-black text-sm uppercase flex items-center">
                            <UserCheck className="w-4 h-4 mr-1.5 text-black"/>
                            Speaker Insights
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {analysis.speaker_analytics?.map((spk, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-xs font-black">
                                <span>{spk.speaker} <span className="text-[10px] font-bold text-zinc-500 font-mono">({spk.sentiment})</span></span>
                                <span className="font-mono">{spk.talk_percentage}%</span>
                              </div>
                              <div className="w-full bg-zinc-100 border-[1.5px] border-black h-3 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#C084FC] h-full"
                                  style={{ width: `${spk.talk_percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white border-[3px] border-black rounded-2xl p-12 text-center shadow-[6px_6px_0px_#000] space-y-4">
                <div className="w-16 h-16 mx-auto bg-[#FDE047] border-[2.5px] border-black rounded-2xl flex items-center justify-center font-black text-3xl shadow-[3px_3px_0px_#000]">
                  🎯
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">No Meeting Selected</h3>
                <p className="text-sm font-bold text-zinc-600 max-w-md mx-auto">
                  Choose a meeting from your collections on the left, or click the button below to load an instant demo.
                </p>
                <button
                  onClick={handleCreateDemo}
                  className="bg-[#FDE047] hover:bg-[#FACC15] text-black border-[2.5px] border-black px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition"
                >
                  ⚡ Load Instant Demo
                </button>
              </div>
            )}
          </main>
        </div>

      </div>
    </div>
  );
}
