"use client";

import { useState, useRef } from "react";

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erreur d'accès au micro :", err);
      alert("Impossible d'accéder au micro. Vérifie les permissions du navigateur.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "40px",
        padding: "80px 24px",
        textAlign: "center",
        flex: 1,
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--teal)",
            marginBottom: "16px",
          }}
        >
          {isRecording ? "● Recording live" : "Ready when you are"}
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            maxWidth: "700px",
          }}
        >
          Speak naturally.{" "}
          <span
            style={{
              background: "linear-gradient(135deg, var(--violet), var(--teal))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            We&apos;ll understand.
          </span>
        </h1>
        <p
          style={{
            marginTop: "16px",
            color: "var(--text-muted)",
            fontSize: "1rem",
            maxWidth: "480px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Answer in Derja, Arabic, French, or any mix of them. Press record and start talking.
        </p>
      </div>

      {/* Signature element: anneaux de voix animés */}
      <div
        style={{
          position: "relative",
          width: "220px",
          height: "220px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isRecording && (
          <>
            <span className="voice-ring" style={{ animationDelay: "0s" }} />
            <span className="voice-ring" style={{ animationDelay: "0.6s" }} />
            <span className="voice-ring" style={{ animationDelay: "1.2s" }} />
          </>
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          style={{
            position: "relative",
            zIndex: 2,
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            border: "none",
            background: isRecording
              ? "linear-gradient(135deg, var(--coral), #c94a3f)"
              : "linear-gradient(135deg, var(--violet), var(--violet-dim))",
            boxShadow: isRecording
              ? "0 0 0 6px rgba(255, 107, 94, 0.15)"
              : "0 0 0 6px rgba(124, 92, 252, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.2rem",
            transition: "transform 0.15s ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {isRecording ? "◼" : "●"}
        </button>
      </div>

      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.8rem",
          color: "var(--text-muted)",
        }}
      >
        {isRecording ? "Tap to stop" : "Tap to start recording"}
      </p>

      {audioUrl && (
        <div
          style={{
            marginTop: "8px",
            padding: "20px 28px",
            borderRadius: "16px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Playback
          </p>
          <audio controls src={audioUrl} style={{ display: "block" }} />
        </div>
      )}

      <style>{`
        .voice-ring {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 2px solid var(--coral);
          opacity: 0;
          animation: ripple 1.8s ease-out infinite;
        }
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.9); opacity: 0; }
        }
      `}</style>
    </section>
  );
}