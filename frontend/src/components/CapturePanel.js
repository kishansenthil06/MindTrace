import { useEffect, useRef, useState } from "react";
import { Camera, Check, Mic, RotateCcw, Square, UserRound } from "lucide-react";

const errorStyle = { color: "#ff9b9d", fontSize: "11px", padding: "0 18px 15px" };

export function CapturePanel({ type, captured, setCaptured }) {
  return type === "camera"
    ? <PhotoCapture captured={captured} setCaptured={setCaptured}/>
    : <AudioCapture captured={captured} setCaptured={setCaptured}/>;
}

function PhotoCapture({ captured, setCaptured }) {
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
    const video = videoRef.current; const canvas = canvasRef.current;
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

  return <div className={`capture-panel ${captured ? "captured" : ""}`} data-testid="photo-capture-panel">
    <div className="capture-visual">
      {snapshot
        ? <img src={snapshot} alt="Captured facial preview" data-testid="captured-photo-preview" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        : stream
          ? <video ref={videoRef} autoPlay muted playsInline data-testid="camera-video"/>
          : <div className="face-placeholder"><span className="scan-ring"><UserRound size={44}/></span><i className="face-corner tl"/><i className="face-corner tr"/><i className="face-corner bl"/><i className="face-corner br"/></div>}
      <span className="capture-label" data-testid="camera-state-label"><span className="pulse-dot"/> {snapshot ? "Photo captured" : stream ? "Camera live" : "Camera preview"}</span>
      <canvas ref={canvasRef} style={{ display: "none" }}/>
    </div>
    <div className="capture-info">
      <div>
        <b>{snapshot ? "Facial photo captured" : "Capture facial signal"}</b>
        <small>{snapshot ? "Not happy with the frame? Retake it or upload a different image." : "Take a live snapshot or choose a JPG/PNG from your device."}</small>
      </div>
      <div className="capture-actions">
        {snapshot
          ? <button className="button primary" data-testid="camera-retake-button" onClick={retake}><RotateCcw size={15}/> Retake photo</button>
          : <button className="button primary" data-testid="camera-capture-button" onClick={stream ? takePhoto : startCamera}>
              <Camera size={15}/> {stream ? "Take photo" : "Start camera"}
            </button>}
        <label className="button ghost" data-testid="facial-upload-button">
          <Camera size={15}/> {snapshot ? "Upload another" : "Upload JPG/PNG"}
          <input type="file" accept="image/jpeg,image/png" data-testid="facial-upload-input" onChange={handleUpload} style={{ display: "none" }}/>
        </label>
      </div>
    </div>
    {error && <div data-testid="camera-error" style={errorStyle}>{error}</div>}
  </div>;
}

function AudioCapture({ captured, setCaptured }) {
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

  return <div className={`capture-panel ${captured ? "captured" : ""}`} data-testid="audio-capture-panel">
    <div className="capture-visual">
      <div className={`audio-visual ${recording ? "recording" : ""}`}>
        <div className="wave-bars">{Array.from({ length: 24 }).map((_, index) => <i key={index} style={{ height: `${18 + (index * 17) % 48}px`, animationDelay: `${(index % 6) * 0.12}s` }}/>)}</div>
        <span className="capture-label" data-testid="audio-state-label">
          <span className="pulse-dot"/> {recording ? `Recording... ${clock}` : audioUrl ? "Recording ready" : "Idle — press record to start"}
        </span>
        {recording && <span className="rec-badge" data-testid="recording-indicator">REC</span>}
      </div>
    </div>
    {audioUrl && <div className="audio-preview" data-testid="audio-preview-wrap">
      <span>Preview</span>
      <audio src={audioUrl} controls data-testid="audio-preview"/>
    </div>}
    <div className="capture-info">
      <div>
        <b>{recording ? "Recording speech sample" : audioUrl ? "Speech sample captured" : "Record speech sample"}</b>
        <small>{recording ? "Speak naturally, then press stop when you are done." : audioUrl ? "Play it back below, or re-record if you want another take." : "Nothing is captured until you press record."}</small>
      </div>
      <div className="capture-actions">
        {recording
          ? <button className="button danger" data-testid="audio-stop-button" onClick={stopRecording}><Square size={13}/> Stop recording</button>
          : audioUrl
            ? <button className="button primary" data-testid="audio-retake-button" onClick={reRecord}><RotateCcw size={15}/> Re-record</button>
            : <button className="button primary" data-testid="audio-capture-button" onClick={startRecording}><Mic size={15}/> Record</button>}
        {audioUrl && !recording && <span className="capture-done" data-testid="audio-captured-flag"><Check size={14}/> Captured</span>}
      </div>
    </div>
    {error && <div data-testid="audio-error" style={errorStyle}>{error}</div>}
  </div>;
}
