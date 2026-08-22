"use client";

import { useState, useRef } from "react";

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      // Demande la permission d'accès au micro
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // À chaque petit bout de son capturé, on le stocke
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        audioChunksRef.current.push(event.data);
      };

      // Quand l'enregistrement s'arrête, on assemble tous les bouts en un seul fichier
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // On coupe le micro proprement une fois fini
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
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Test d&apos;enregistrement audio</h2>

      {!isRecording ? (
        <button onClick={startRecording} style={{ padding: "10px 20px", fontSize: "16px" }}>
          🎙️ Start Recording
        </button>
      ) : (
        <button onClick={stopRecording} style={{ padding: "10px 20px", fontSize: "16px" }}>
          ⏹️ Stop Recording
        </button>
      )}

      {audioUrl && (
        <div style={{ marginTop: "1.5rem" }}>
          <p>Voici ce qui a été enregistré :</p>
          <audio controls src={audioUrl}></audio>
        </div>
      )}
    </div>
  );
}