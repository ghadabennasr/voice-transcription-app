require("dotenv").config();
const fastify = require("fastify")({ logger: true });
const { GoogleGenAI, Modality } = require("@google/genai");
const websocketPlugin = require("@fastify/websocket");

fastify.register(require("@fastify/cors"), {
  origin: "http://localhost:3000",
});
fastify.register(require("@fastify/multipart"));
fastify.register(websocketPlugin);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const LIVE_MODEL = "gemini-3.5-transcribe-live";

fastify.get("/", async () => {
  return { status: "Backend is running" };
});

// --- Route existante de l'étape 3 (upload simple) : inchangée ---
fastify.post("/transcribe", async (request, reply) => {
  const data = await request.file();
  if (!data) return reply.status(400).send({ error: "No audio file received" });

  const buffer = await data.toBuffer();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Listen to this audio carefully and transcribe only what is explicitly spoken word for word. Ignore background noise. If there are no clear spoken words, return an empty string.",
            },
            {
              inlineData: {
                mimeType: data.mimetype === "application/octet-stream" ? "audio/mp3" : data.mimetype,
                data: buffer.toString("base64"),
              },
            },
          ],
        },
      ],
    });
    return { message: "Transcription successful", filename: data.filename, transcription: response.text };
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: "Gemini transcription failed", details: err.message });
  }
});

// --- NOUVELLE route : WebSocket pour le streaming temps réel ---
fastify.register(async function (fastify) {
  fastify.get("/ws-transcribe", { websocket: true }, (socket, req) => {
    fastify.log.info("Frontend connecté au WebSocket");

    let geminiSession = null;
    let sessionReady = false;

    // On ouvre une session Gemini Live DÈS que le frontend se connecte
    ai.live
      .connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.TEXT],
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            fastify.log.info("Session Gemini Live ouverte");
            sessionReady = true;
          },
          onmessage: (message) => {
            const interim = message.serverContent?.interimInputTranscription?.text;
            if (interim) {
              // On relaie la transcription au frontend, en JSON
              socket.send(JSON.stringify({ type: "transcript", text: interim }));
            }
          },
          onerror: (e) => {
            fastify.log.error("Erreur Gemini Live: " + e.message);
            socket.send(JSON.stringify({ type: "error", message: e.message }));
          },
          onclose: (e) => {
            fastify.log.info("Session Gemini Live fermée: " + (e.reason || "sans raison"));
          },
        },
      })
      .then((session) => {
        geminiSession = session;
      })
      .catch((err) => {
        fastify.log.error("Échec de connexion à Gemini Live: " + err.message);
        socket.send(JSON.stringify({ type: "error", message: err.message }));
      });

    // Chaque paquet audio (binaire, PCM 16kHz déjà prêt) envoyé par le frontend
    // est directement relayé à Gemini
    socket.on("message", (rawData) => {
      if (!sessionReady || !geminiSession) return; // ignore si Gemini pas encore prêt

      // rawData est un Buffer binaire (PCM brut envoyé par le frontend)
      geminiSession.sendRealtimeInput({
        audio: {
          data: rawData.toString("base64"),
          mimeType: "audio/pcm;rate=16000",
        },
      });
    });

    socket.on("close", () => {
      fastify.log.info("Frontend déconnecté");
      if (geminiSession) {
        geminiSession.sendRealtimeInput({ audioStreamEnd: true });
        geminiSession.close();
      }
    });
  });
});

const start = async () => {
  try {
    await fastify.listen({ port: 4000 });
    console.log("Backend running on http://localhost:4000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();