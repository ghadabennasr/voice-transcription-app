require("dotenv").config();
const fastify = require("fastify")({ logger: true });
const { GoogleGenAI } = require("@google/genai");

// Autorise le frontend (localhost:3000) à faire des requêtes vers ce backend
fastify.register(require("@fastify/cors"), {
  origin: "http://localhost:3000",
});

// Permet de recevoir des fichiers (l'audio enregistré)
fastify.register(require("@fastify/multipart"));

// Client Gemini, initialisé avec la clé lue depuis .env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Route de test simple, pour vérifier que le serveur tourne
fastify.get("/", async () => {
  return { status: "Backend is running" };
});

// La vraie route : reçoit l'audio, l'envoie à Gemini, renvoie la transcription
fastify.post("/transcribe", async (request, reply) => {
  const data = await request.file(); // récupère le fichier envoyé

  if (!data) {
    return reply.status(400).send({ error: "No audio file received" });
  }

  const buffer = await data.toBuffer();
  fastify.log.info(`Received audio file: ${data.filename}, size: ${buffer.length} bytes`);

  try {
    const audioBase64 = buffer.toString("base64");

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
                mimeType: data.mimetype=== "application/octet-stream" ? "audio/mp3" : data.mimetype,
                data: audioBase64,
              },
            },
          ],
        },
      ],
    });


    const transcription = response.text;

    return {
      message: "Transcription successful",
      filename: data.filename,
      sizeInBytes: buffer.length,
      transcription,
    };
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: "Gemini transcription failed", details: err.message });
  }
});

// Démarre le serveur sur le port 4000
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