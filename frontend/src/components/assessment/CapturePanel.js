import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Check, Mic, RotateCcw, Square, Upload, UserRound } from "lucide-react";

const shell = "overflow-hidden rounded-2xl border border-[#262A38] bg-[#0F1118]";
const stage = "relative flex h-64 items-center justify-center overflow-hidden border-b border-[#262A38] bg-[#0A0B10] sm:h-72";

function StageLabel({ children, testId }) {
  return (
    <span
      className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0A0B10]/85 px-3 py-1 text-[11px] text-slate-300 backdrop-blur"
      data-testid={testId}
    >
      <i className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
      {children}
    </span>
  );
}

function Bar({ children }) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">{children}</div>
  );
}

export function CapturePanel({ type, captured, setCaptured }) {
  return type === "camera"
    ? <PhotoCapture captured={captured} setCaptured={setCaptured} />
    : <AudioCapture captured={captured} setCaptured={setCaptured} />;
}

function PhotoCapture({ setCaptured }) {
  const [stream, setStream] = useState(null);
  const [snapshot, setSnapshot] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => { if (stream && videoRef.current) videoRef.current.srcObject = stream; }, [stream]);
  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  const stopStream = () => { stream?.getTracks().forEach((track) => track.stop()); setStream(null); };

  const startCamera = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is unavailable in this browser. Upload a JPG or PNG instead.");
      return;
    }
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }));
    } catch {
      setError("Camera permission was unavailable. Upload a JPG or PNG instead.");
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      setError("Camera is still starting. Wait a moment, then try capture again.");
      return;
    }
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL("image/jpeg", 0.88));
    setCaptured(true);
    stopStream();
  };

  const retake = async () => { setSnapshot(""); setCaptured(false); setError(""); await startCamera(); };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose a JPG or PNG image."); return; }
    const reader = new FileReader();
    reader.onload = () => { setSnapshot(reader.result); setCaptured(true); setError(""); stopStream(); };
    reader.readAsDataURL(file);
  };

  return (
    <div className={shell} data-testid="photo-capture-panel">
      <div className={stage}>
        <StageLabel testId="camera-state-label">
          {snapshot ? "Photo captured" : stream ? "Camera live" : "Camera preview"}
        </StageLabel>
        {snapshot ? (
          <img src={snapshot} alt="Captured facial preview" className="h-full w-full object-cover" data-testid="captured-photo-preview" />
        ) : stream ? (
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" data-testid="camera-video" />
        ) : (
          <div className="relative grid h-40 w-40 place-items-center">
            <motion.span
              className="absolute inset-0 rounded-full border border-cyan-400/25"
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="grid h-20 w-20 place-items-center rounded-full border border-[#262A38] bg-[#13151D] text-slate-500">
              <UserRound size={30} />
            </span>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <Bar>
        <div>
          <b className="block text-sm font-medium">{snapshot ? "Facial photo captured" : "Capture facial signal"}</b>
          <small className="mt-1 block text-xs text-slate-500">
            {snapshot ? "Not happy with the frame? Retake it or upload a different image." : "Take a live snapshot or choose a JPG/PNG from your device."}
          </small>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {snapshot ? (
            <button className="btn-primary" onClick={retake} data-testid="camera-retake-button">
              <RotateCcw size={14} /> Retake photo
            </button>
          ) : (
            <button className="btn-primary" onClick={stream ? takePhoto : startCamera} data-testid="camera-capture-button">
              <Camera size={14} /> {stream ? "Take photo" : "Start camera"}
            </button>
          )}
          <label className="btn-secondary cursor-pointer" data-testid="facial-upload-button">
            <Upload size={14} /> {snapshot ? "Upload another" : "Upload JPG/PNG"}
            <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleUpload} data-testid="facial-upload-input" />
          </label>
        </div>
      </Bar>
      {error && <p className="px-5 pb-4 text-xs text-red-400" data-testid="camera-error">{error}</p>}
    </div>
  );
}

function AudioCapture({ setCaptured }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const urlRef = useRef("");

  useEffect(() => () => {
    clearInterval(timerRef.current);
    recorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const startRecording = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Microphone recording is unavailable in this browser.");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone permission was unavailable. Allow access and try again.");
      return;
    }
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = ""; }
    setAudioUrl("");
    setCaptured(false);
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      clearInterval(timerRef.current);
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      if (!blob.size) { setError("No audio was captured. Try recording again."); setRecording(false); return; }
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setAudioUrl(url);
      setCaptured(true);
      setRecording(false);
    };
    recorderRef.current = recorder;
    try {
      recorder.start();
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setError("Recording could not be started in this browser. Try a different browser.");
      return;
    }
    setSeconds(0);
    setRecording(true);
    timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else { clearInterval(timerRef.current); setRecording(false); }
  };

  const reRecord = () => {
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = ""; }
    setAudioUrl("");
    setCaptured(false);
    setSeconds(0);
    setError("");
  };

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className={shell} data-testid="audio-capture-panel">
      <div className={stage}>
        <StageLabel testId="audio-state-label">
          {recording ? `Recording... ${clock}` : audioUrl ? "Recording ready" : "Idle — press record to start"}
        </StageLabel>
        {recording && (
          <span className="absolute right-4 top-4 z-10 animate-pulse rounded-full bg-red-500 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-widest text-white" data-testid="recording-indicator">
            REC
          </span>
        )}
        <div className="flex h-24 items-end gap-[3px]" data-testid="waveform">
          {Array.from({ length: 28 }).map((_, index) => (
            <motion.i
              key={index}
              className="block w-[3px] rounded-full bg-gradient-to-t from-blue-600 to-cyan-400"
              style={{ height: 12 + ((index * 17) % 52) }}
              animate={recording ? { scaleY: [0.35, 1, 0.5], opacity: 0.9 } : { scaleY: 0.28, opacity: 0.3 }}
              transition={recording ? { duration: 0.9, repeat: Infinity, repeatType: "mirror", delay: (index % 7) * 0.09 } : { duration: 0.3 }}
            />
          ))}
        </div>
      </div>
      {audioUrl && (
        <div className="flex items-center gap-4 border-b border-[#262A38] px-5 py-4" data-testid="audio-preview-wrap">
          <span className="label-xs shrink-0">Preview</span>
          <audio src={audioUrl} controls className="h-9 w-full min-w-0" data-testid="audio-preview" />
        </div>
      )}
      <Bar>
        <div>
          <b className="block text-sm font-medium">
            {recording ? "Recording speech sample" : audioUrl ? "Speech sample captured" : "Record speech sample"}
          </b>
          <small className="mt-1 block text-xs text-slate-500">
            {recording
              ? "Speak naturally, then press stop when you are done."
              : audioUrl
                ? "Play it back above, or re-record if you want another take."
                : "Nothing is captured until you press record."}
          </small>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {recording ? (
            <button className="btn-danger" onClick={stopRecording} data-testid="audio-stop-button">
              <Square size={12} /> Stop recording
            </button>
          ) : audioUrl ? (
            <button className="btn-primary" onClick={reRecord} data-testid="audio-retake-button">
              <RotateCcw size={14} /> Re-record
            </button>
          ) : (
            <button className="btn-primary" onClick={startRecording} data-testid="audio-capture-button">
              <Mic size={14} /> Record
            </button>
          )}
          {audioUrl && !recording && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400" data-testid="audio-captured-flag">
              <Check size={13} /> Captured
            </span>
          )}
        </div>
      </Bar>
      {error && <p className="px-5 pb-4 text-xs text-red-400" data-testid="audio-error">{error}</p>}
    </div>
  );
}
