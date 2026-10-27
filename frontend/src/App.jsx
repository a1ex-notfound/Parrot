import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, Upload, Sparkles, CheckCircle2, 
  FileText, Trash2, ArrowRightCircle, ListChecks, Mic, Square, 
  RefreshCw, UserCheck, Folder
} from "lucide-react";

export default function App() {
  const [meetings, setMeetings] = useState([]);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  
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

  const parseDurationStringToSeconds = (durStr) => {
    if (!durStr) return 0;
    const parts = durStr.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return Number(durStr) || 0;
  };

  const loadMeeting = async (id) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/meetings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveMeeting(data);
        setCurrentTime(0);
        setIsPlaying(false);
        const fallbackSec = parseDurationStringToSeconds(data.duration);
        setAudioDuration(fallbackSec > 0 ? fallbackSec : 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReanalyze = async () => {
    if (!activeMeeting) return;
    setIsReanalyzing(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/meetings/${activeMeeting.id}/reanalyze`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Re-analysis failed");
      setActiveMeeting({ ...activeMeeting, analysis: data.analysis });
    } catch (err) {
      alert("Gemma re-analysis failed: " + err.message);
    } finally {
      setIsReanalyzing(false);
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

  const formatSeconds = (totalSecs) => {
    if (!totalSecs || isNaN(totalSecs) || totalSecs < 0) return "0:00";
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const effectiveDuration = audioDuration || parseDurationStringToSeconds(activeMeeting?.duration) || 1;
  const currentPercentage = Math.min((currentTime / effectiveDuration) * 100, 100);

  const analysis = activeMeeting?.analysis || {};

  const folderColors = [
    { bg: "bg-[#4ADE80]" }, // Mint Green
    { bg: "bg-[#F472B6]" }, // Pink
    { bg: "bg-[#C084FC]" }, // Purple
    { bg: "bg-[#FDE047]" }, // Yellow
    { bg: "bg-[#38BDF8]" }, // Sky
  ];

  return (
    <div className="h-screen w-screen bg-[#FEF08A] text-black font-sans selection:bg-black selection:text-[#FEF08A] p-3 md:p-4 flex flex-col overflow-hidden relative">
      
      {/* Decorative Neo-Brutalist Shapes */}
      <div className="absolute top-10 left-[-35px] w-28 h-28 rounded-full bg-[#F472B6] border-[3px] border-black -z-10 pointer-events-none" />
      <div className="absolute bottom-10 right-[-15px] w-40 h-52 rounded-3xl bg-[#C084FC] border-[3px] border-black -z-10 pointer-events-none" />

      {/* Main Container - Strict Screen Fit */}
      <div className="w-full h-full flex flex-col min-h-0 max-w-[1700px] mx-auto">
        
        {/* Compact Navbar */}
        <header className="bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_#000] px-4 py-2.5 mb-2.5 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDE047] border-[2.5px] border-black flex items-center justify-center font-black text-xl shadow-[2.5px_2.5px_0px_#000]">
              🦦
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none uppercase">BLACKBOX AI</h1>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Privacy-First Meeting Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isProcessing}
                className="bg-[#FDA4AF] hover:bg-[#FB7185] text-black border-[2px] border-black px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-[2.5px_2.5px_0px_#000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all flex items-center space-x-1.5"
              >
                <Mic className="w-3.5 h-3.5"/>
                <span>Record Mic</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="bg-red-500 text-white border-[2px] border-black px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-[2.5px_2.5px_0px_#000] animate-pulse flex items-center space-x-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-current"/>
                <span>Stop & Transcribe</span>
              </button>
            )}

            <button
              onClick={handleCreateDemo}
              disabled={isProcessing}
              className="bg-[#DDD6FE] hover:bg-[#C4B5FD] text-black border-[2px] border-black px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-[2.5px_2.5px_0px_#000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5"/>
              <span>Load Demo</span>
            </button>

            <label className="bg-[#FDE047] hover:bg-[#FACC15] text-black border-[2px] border-black px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-[2.5px_2.5px_0px_#000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all flex items-center space-x-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5"/>
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

        {/* Compact Title Row */}
        <div className="mb-2.5 flex items-center justify-between flex-shrink-0 px-1">
          <h2 className="text-2xl font-black tracking-tight leading-none text-black">
            Listen now. Decide anytime.
          </h2>
          <div className="flex items-center space-x-2">
            <span className="bg-white border-[2px] border-black rounded-lg px-2.5 py-1 text-[11px] font-black uppercase shadow-[2px_2px_0px_#000]">
              🔒 100% On-Device Whisper
            </span>
            <span className="bg-[#4ADE80] border-[2px] border-black rounded-lg px-2.5 py-1 text-[11px] font-black uppercase shadow-[2px_2px_0px_#000]">
              ⚡ OpenRouter Gemma 4
            </span>
          </div>
        </div>

        {/* Workspace: Fits Viewport Exactly (No Page Scroll) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-0 overflow-hidden">
          
          {/* Left Column: Meetings Collection List */}
          <aside className="lg:col-span-3 flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between mb-1.5 px-1 flex-shrink-0">
              <h3 className="text-xs font-black uppercase tracking-tight flex items-center">
                <Folder className="w-4 h-4 mr-1.5"/>
                My Meetings ({meetings.length})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
              {meetings.map((m, idx) => {
                const colorScheme = folderColors[idx % folderColors.length];
                const isActive = activeMeeting?.id === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => loadMeeting(m.id)}
                    className={`relative cursor-pointer transition-all ${
                      isActive ? "translate-x-1 -translate-y-0.5" : "hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-end pl-3">
                      <div className={`h-3 w-20 ${colorScheme.bg} border-t-[2px] border-l-[2px] border-r-[2px] border-black rounded-t-md`} />
                    </div>

                    <div className={`bg-white border-[2px] border-black rounded-xl p-3 shadow-[3px_3px_0px_#000] ${
                      isActive ? "ring-2 ring-black bg-[#FFFBEB]" : ""
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg ${colorScheme.bg} border-[1.5px] border-black flex items-center justify-center font-black shadow-[1.5px_1.5px_0px_#000] flex-shrink-0`}>
                            <FileText className="w-3.5 h-3.5"/>
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-xs text-black leading-snug truncate">
                              {m.title}
                            </h4>
                            <p className="text-[10px] font-bold text-zinc-500 font-mono mt-0.5">
                              {m.duration || "Recorded"} • {m.status || "Ready"}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleDeleteMeeting(e, m.id)}
                          className="hover:bg-rose-100 text-zinc-500 hover:text-rose-600 p-1 rounded border border-transparent hover:border-black transition flex-shrink-0"
                          title="Delete meeting"
                        >
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {meetings.length === 0 && (
                <div className="bg-white border-[2px] border-dashed border-black rounded-xl p-5 text-center shadow-[3px_3px_0px_#000]">
                  <p className="font-bold text-xs text-zinc-700">No meetings recorded.</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Click "Load Demo" to preview!</p>
                </div>
              )}
            </div>
          </aside>

          {/* Right Column: Player + Split Content (Diarized & Intelligence) */}
          <main className="lg:col-span-9 flex flex-col h-full min-h-0 space-y-2.5">
            {activeMeeting ? (
              <>
                {/* Audio Scrubber Bar (Compact) */}
                <div className="bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_#000] p-3.5 flex-shrink-0">
                  <div className="flex items-center justify-between pb-2.5 border-b-[2px] border-black gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-widest bg-[#FDE047] border border-black px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#000]">
                        Active Intelligence File
                      </span>
                      <h3 className="text-base font-black text-black tracking-tight truncate mt-0.5">{activeMeeting.title}</h3>
                    </div>

                    {/* Speed Controls */}
                    <div className="flex items-center space-x-1 bg-[#FEF08A] border-[1.5px] border-black rounded-lg p-0.5 shadow-[1.5px_1.5px_0px_#000] flex-shrink-0">
                      {[1, 1.25, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => changeSpeed(spd)}
                          className={`text-[10px] px-2 py-0.5 rounded font-black font-mono transition ${
                            playbackSpeed === spd ? "bg-black text-[#FDE047]" : "text-black hover:bg-white"
                          }`}
                        >
                          {spd}×
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scrubber Waveform */}
                  <div className="mt-2.5 flex items-center space-x-3">
                    <button
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-xl bg-[#FDE047] hover:bg-[#FACC15] text-black border-[2px] border-black flex items-center justify-center font-black shadow-[2.5px_2.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition flex-shrink-0"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current"/> : <Play className="w-5 h-5 fill-current ml-0.5"/>}
                    </button>

                    <div className="flex-1 flex items-center space-x-1 h-9 bg-zinc-50 border-[2px] border-black rounded-xl px-2.5 overflow-hidden shadow-[2px_2px_0px_#000]">
                      {Array.from({ length: 48 }).map((_, idx) => {
                        const height = 25 + Math.sin(idx * 0.45) * 45 + (idx % 3) * 15;
                        const barPercent = (idx / 48) * 100;
                        const isPassed = barPercent <= currentPercentage;

                        return (
                          <div
                            key={idx}
                            onClick={() => seekTo((idx / 48) * effectiveDuration)}
                            style={{ height: `${Math.min(height, 90)}%` }}
                            className={`flex-1 rounded-sm cursor-pointer transition-all duration-75 ${
                              isPassed ? "bg-black" : "bg-zinc-300 hover:bg-zinc-400"
                            }`}
                            title={`Jump to ${formatSeconds((idx / 48) * effectiveDuration)}`}
                          />
                        );
                      })}
                    </div>

                    <div className="font-mono font-black text-xs bg-white border-[2px] border-black px-2 py-1 rounded-lg shadow-[2px_2px_0px_#000] flex-shrink-0">
                      {formatSeconds(currentTime)} / {formatSeconds(effectiveDuration)}
                    </div>
                  </div>

                  <audio
                    ref={audioRef}
                    onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
                    onLoadedMetadata={() => audioRef.current && setAudioDuration(audioRef.current.duration)}
                    onEnded={() => {
                      setIsPlaying(false);
                      setCurrentTime(0);
                    }}
                    src={activeMeeting.audio_filename ? `http://127.0.0.1:8000/api/audio/${activeMeeting.audio_filename}` : undefined}
                  />
                </div>

                {/* Split Workspace: Left Transcript, Right Intelligence Panels */}
                <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  
                  {/* Left: Diarized Transcript (NO Extra White Blank Space) */}
                  <div className="flex flex-col h-full min-h-0">
                    <div className="flex items-end pl-3 flex-shrink-0">
                      <div className="h-3 w-28 bg-[#38BDF8] border-t-[2px] border-l-[2px] border-r-[2px] border-black rounded-t-lg" />
                    </div>

                    <div className="bg-white border-[3px] border-black rounded-2xl p-3.5 shadow-[4px_4px_0px_#000] flex-1 flex flex-col min-h-0 overflow-hidden">
                      <div className="flex items-center justify-between pb-2 border-b-[2px] border-black mb-2.5 flex-shrink-0">
                        <span className="font-black text-xs uppercase flex items-center">
                          <FileText className="w-3.5 h-3.5 mr-1.5 text-black"/>
                          Diarized Transcript
                        </span>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">Click text to seek</span>
                      </div>

                      {/* Flexibly fills the entire card without leaving any blank void at the bottom */}
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                        {activeMeeting.transcript?.map((item, idx) => {
                          const isCurrent = currentTime >= item.start && currentTime <= item.end;
                          return (
                            <div
                              key={idx}
                              onClick={() => seekTo(item.start)}
                              className={`p-2.5 rounded-xl border-[1.5px] border-black cursor-pointer transition-all ${
                                isCurrent
                                  ? "bg-[#FEF08A] shadow-[2.5px_2.5px_0px_#000] translate-x-1"
                                  : "bg-white hover:bg-zinc-50 shadow-[1.5px_1.5px_0px_#000]"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-black text-[11px] uppercase tracking-wider">{item.speaker}</span>
                                <span className="font-mono text-[9px] font-bold bg-white border border-black px-1.5 rounded">
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

                  {/* Right: Gemma 4 Intelligence Suite (Dedicated Scroll Container) */}
                  <div className="flex flex-col h-full min-h-0">
                    <div className="flex items-end justify-between pl-3 pr-1 flex-shrink-0">
                      <div className="h-3 w-32 bg-[#F472B6] border-t-[2px] border-l-[2px] border-r-[2px] border-black rounded-t-lg" />
                      
                      <button
                        onClick={handleReanalyze}
                        disabled={isReanalyzing}
                        className="bg-black text-[#FDE047] hover:bg-zinc-800 border-[2px] border-black px-2 py-0.5 rounded-t-md font-black text-[9px] uppercase flex items-center space-x-1 tracking-wider shadow-[2px_0px_0px_#000]"
                        title="Generate fresh Gemma intelligence directly from transcript"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${isReanalyzing ? "animate-spin" : ""}`} />
                        <span>{isReanalyzing ? "Analyzing..." : "Re-run Gemma AI"}</span>
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                      
                      {/* Executive Summary & Key Highlights */}
                      <div className="bg-white border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0px_#000] space-y-3">
                        <div className="flex items-center justify-between pb-1.5 border-b-[2px] border-black">
                          <span className="font-black text-xs uppercase flex items-center">
                            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-black"/>
                            Executive Summary
                          </span>
                        </div>
                        <p className="text-xs font-semibold leading-relaxed text-zinc-800">
                          {analysis.executive_summary || "No executive summary available."}
                        </p>

                        {analysis.key_takeaways?.length > 0 && (
                          <div className="pt-2 border-t-[1.5px] border-zinc-200 space-y-1.5">
                            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Key Highlights</span>
                            {analysis.key_takeaways.map((point, idx) => (
                              <div key={idx} className="flex items-start space-x-2 text-xs font-medium text-zinc-900 bg-[#F9FAFB] border border-black p-2 rounded-lg">
                                <span className="font-black text-black">•</span>
                                <span>{point}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Items Matrix */}
                      <div className="bg-white border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0px_#000] space-y-2.5">
                        <div className="flex items-center justify-between pb-1.5 border-b-[2px] border-black">
                          <span className="font-black text-xs uppercase flex items-center">
                            <ListChecks className="w-3.5 h-3.5 mr-1.5 text-black"/>
                            Action Items Matrix
                          </span>
                        </div>

                        <div className="space-y-2">
                          {analysis.action_items?.map((act, i) => (
                            <div key={i} className="bg-white border-[2px] border-black p-2.5 rounded-xl shadow-[2px_2px_0px_#000] space-y-1">
                              <p className="text-xs font-black text-black">{act.task}</p>
                              <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono font-bold">
                                <span className="bg-[#FEF08A] border border-black px-1.5 py-0.5 rounded">👤 {act.owner || "Unassigned"}</span>
                                <span className="bg-zinc-100 border border-black px-1.5 py-0.5 rounded">⏳ {act.deadline || "TBD"}</span>
                                <span className="bg-[#FDA4AF] border border-black px-1.5 py-0.5 rounded uppercase">📌 {act.priority || "High"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Decisions & Agreed Next Steps */}
                      <div className="bg-white border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0px_#000] space-y-2.5">
                        <div className="flex items-center justify-between pb-1.5 border-b-[2px] border-black">
                          <span className="font-black text-xs uppercase flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-black"/>
                            Decisions & Next Steps
                          </span>
                        </div>

                        <div className="space-y-1.5">
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

                      {/* Speaker Sentiment & Talk-Time Analytics */}
                      <div className="bg-white border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0px_#000] space-y-2.5">
                        <div className="flex items-center justify-between pb-1.5 border-b-[2px] border-black">
                          <span className="font-black text-xs uppercase flex items-center">
                            <UserCheck className="w-3.5 h-3.5 mr-1.5 text-black"/>
                            Speaker Insights
                          </span>
                        </div>

                        <div className="space-y-2">
                          {analysis.speaker_analytics?.map((spk, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-xs font-black">
                                <span>{spk.speaker} <span className="text-[10px] font-bold text-zinc-500 font-mono">({spk.sentiment})</span></span>
                                <span className="font-mono">{spk.talk_percentage}%</span>
                              </div>
                              <div className="w-full bg-zinc-100 border-[1.5px] border-black h-2.5 rounded-full overflow-hidden">
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
              <div className="bg-white border-[3px] border-black rounded-2xl p-8 text-center shadow-[5px_5px_0px_#000] space-y-3 m-auto">
                <div className="w-14 h-14 mx-auto bg-[#FDE047] border-[2px] border-black rounded-2xl flex items-center justify-center font-black text-2xl shadow-[3px_3px_0px_#000]">
                  🎯
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">No Meeting Selected</h3>
                <p className="text-xs font-bold text-zinc-600 max-w-sm mx-auto">
                  Left collection se meeting select karein ya neeche click karke demo load karein.
                </p>
                <button
                  onClick={handleCreateDemo}
                  className="bg-[#FDE047] hover:bg-[#FACC15] text-black border-[2px] border-black px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition"
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
