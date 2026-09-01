"use client";

import { useState, useRef, useEffect } from "react";

export default function LiveTranscriber() {
  const [isRecording, setIsRecording] = useState(false);
  const [finalizedText, setFinalizedText] = useState(""); // texte confirmé, ne bouge plus
  const [interimText, setInterimText] = useState(""); // texte provisoire, en cours de complétion
  const [status, setStatus] = useState("Idle");

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptBoxRef = useRef<HTMLDivElement | null>(null);
  const interimTextRef = useRef(""); // pour lire la dernière valeur dans les callbacks WS
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    interimTextRef.current = interimText;
  }, [interimText]);

  // Fige le texte en cours dans l'historique définitif
  const finalizeCurrentText = () => {
    if (interimTextRef.current) {
      setFinalizedText((prev) => (prev ? prev + " " + interimTextRef.current : interimTextRef.current));
      setInterimText("");
      interimTextRef.current = "";
    }
  };

  // Auto-scroll vers le bas à chaque nouvelle transcription
  useEffect(() => {
    if (transcriptBoxRef.current) {
      transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
    }
  }, [finalizedText, interimText]);

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
          // Le texte reçu est toujours la version la plus à jour du tour EN COURS
          setInterimText(data.text);

          // On repousse le "minuteur de silence" à chaque nouveau mot reçu.
          // Si aucune mise à jour n'arrive pendant 1.2s, on considère la
          // phrase terminée et on la fige dans l'historique (ce modèle
          // n'envoie jamais de signal "turnComplete" explicite).
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            finalizeCurrentText();
          }, 1200);
        } else if (data.type === "turn_complete") {
          // Gardé au cas où un autre modèle enverrait ce signal explicitement
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          finalizeCurrentText();
        } else if (data.type === "error") {
          setStatus("Erreur: " + data.message);
        }
      };

      ws.onerror = () => setStatus("Erreur de connexion WebSocket");
      ws.onclose = () => setStatus("Déconnecté");
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

    // On fige tout texte en cours au moment de l'arrêt
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    finalizeCurrentText();

    setIsRecording(false);
    setStatus("Arrêté");
  };

  const clearTranscript = () => {
    setFinalizedText("");
    setInterimText("");
  };

  const copyTranscript = () => {
    const fullText = (finalizedText + " " + interimText).trim();
    navigator.clipboard.writeText(fullText);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center" }}>Transcription en temps réel</h2>
      <p style={{ color: "#666", textAlign: "center", marginBottom: "1rem" }}>{status}</p>

      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "1rem" }}>
        {!isRecording ? (
          <button onClick={startRecording} style={{ padding: "10px 20px", fontSize: "16px" }}>
            🎙️ Start Live Transcription
          </button>
        ) : (
          <button onClick={stopRecording} style={{ padding: "10px 20px", fontSize: "16px" }}>
            ⏹️ Stop
          </button>
        )}
        <button onClick={clearTranscript} style={{ padding: "10px 20px", fontSize: "16px" }}>
          🗑️ Clear
        </button>
        <button onClick={copyTranscript} style={{ padding: "10px 20px", fontSize: "16px" }}>
          📋 Copy
        </button>
      </div>

      <div
        ref={transcriptBoxRef}
        style={{
          padding: "1rem",
          minHeight: "150px",
          maxHeight: "350px",
          overflowY: "auto",
          border: "1px solid #ccc",
          borderRadius: "8px",
          textAlign: "right",
          direction: "rtl",
          fontSize: "1.1rem",
          lineHeight: "1.8",
        }}
      >
        <span>{finalizedText}</span>{" "}
        <span style={{ color: "#999", fontStyle: "italic" }}>{interimText}</span>
        {!finalizedText && !interimText && (
          <span style={{ color: "#aaa" }}>La transcription apparaîtra ici...</span>
        )}
      </div>
    </div>
  );
}