const fastify = require("fastify")({ logger: true });

// Autorise le frontend (localhost:3000) à faire des requêtes vers ce backend
fastify.register(require("@fastify/cors"), {
  origin: "http://localhost:3000",
});

// Permet de recevoir des fichiers (l'audio enregistré)
fastify.register(require("@fastify/multipart"));

// Route de test simple, pour vérifier que le serveur tourne
fastify.get("/", async () => {
  return { status: "Backend is running" };
});

// La vraie route : reçoit l'audio envoyé par le frontend
fastify.post("/transcribe", async (request, reply) => {
  const data = await request.file(); // récupère le fichier envoyé

  if (!data) {
    return reply.status(400).send({ error: "No audio file received" });
  }

  // Pour l'instant, on vérifie juste qu'on a bien reçu le fichier
  // (l'appel réel à Gemini viendra à l'étape 3)
  const buffer = await data.toBuffer();

  fastify.log.info(`Received audio file: ${data.filename}, size: ${buffer.length} bytes`);

  return {
    message: "Audio received successfully",
    filename: data.filename,
    sizeInBytes: buffer.length,
  };
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