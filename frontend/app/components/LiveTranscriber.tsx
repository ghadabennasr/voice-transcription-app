"use client";

import { useState, useRef } from "react";

export default function LiveTranscriber() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("Idle");

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Convertit un tableau Float32 (format natif du navigateur) en Int16
  // (format PCM attendu par Gemini)
  function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  // Rééchantillonne le son du taux natif du navigateur (souvent 44100/48000 Hz)
  // vers 16000 Hz, requis par Gemini Live
  function downsampleTo16kHz(buffer: Float32Array, inputSampleRate: number): Float32Array {
    const targetRate = 16000;
    if (inputSampleRate === targetRate) return buffer;

    const ratio = inputSampleRate / targetRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      result[i] = buffer[Math.floor(i * ratio)];
    }
    return result;
  }

  const startRecording = async () => {
    try {
      setStatus("Connexion au serveur...");
      const ws = new WebSocket("ws://localhost:4000/ws-transcribe");
      wsRef.current = ws;

      ws.onopen = async () => {
        setStatus("Connecté, demande du micro...");

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        // ScriptProcessorNode capture l'audio brut par petits blocs (4096 échantillons)
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          const downsampled = downsampleTo16kHz(inputData, audioContext.sampleRate);
          const pcmBuffer = floatTo16BitPCM(downsampled);

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(pcmBuffer);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        setIsRecording(true);
        setStatus("🔴 Enregistrement en cours...");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "transcript") {
          setTranscript(data.text);
        } else if (data.type === "error") {
          setStatus("Erreur: " + data.message);
        }
      };

      ws.onerror = () => {
        setStatus("Erreur de connexion WebSocket");
      };

      ws.onclose = () => {
        setStatus("Déconnecté");
      };
    } catch (err) {
      console.error(err);
      setStatus("Erreur d'accès au micro");
    }
  };

  const stopRecording = () => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    wsRef.current?.close();

    setIsRecording(false);
    setStatus("Arrêté");
  };

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Transcription en temps réel</h2>
      <p style={{ color: "#666", marginBottom: "1rem" }}>{status}</p>

      {!isRecording ? (
        <button onClick={startRecording} style={{ padding: "10px 20px", fontSize: "16px" }}>
          🎙️ Start Live Transcription
        </button>
      ) : (
        <button onClick={stopRecording} style={{ padding: "10px 20px", fontSize: "16px" }}>
          ⏹️ Stop
        </button>
      )}

      <div
        style={{
          marginTop: "1.5rem",
          padding: "1rem",
          minHeight: "80px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          textAlign: "left",
          direction: "rtl",
          fontSize: "1.1rem",
        }}
      >
        {transcript || "La transcription apparaîtra ici..."}
      </div>
    </div>
  );
}