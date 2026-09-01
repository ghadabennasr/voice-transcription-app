// Script de TEST ISOLÉ — sert à valider que la connexion au Gemini Live API
// fonctionne correctement, avec un fichier audio pré-enregistré.
// Ce n'est PAS encore intégré au serveur Fastify (viendra dans une prochaine étape,
// avec un vrai WebSocket entre le frontend et le backend).

require("dotenv").config();
const fs = require("fs");
const { GoogleGenAI, Modality } = require("@google/genai");
const { WaveFile } = require("wavefile");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Modèle dédié à la transcription en streaming (trouvé via list-live-models.js)
const model = "gemini-3.5-transcribe-live";

// Le Live API exige du PCM brut 16-bit, 16kHz, mono.
// Cette fonction convertit n'importe quel fichier .wav vers ce format exact.
function convertToPCM16k(inputPath) {
  const buffer = fs.readFileSync(inputPath);
  const wav = new WaveFile(buffer);
  console.log("Format original:", JSON.stringify(wav.fmt, null, 2));

  wav.toSampleRate(16000);
  wav.toBitDepth("16");

  const rawSamples = Buffer.from(wav.data.samples);
  const numChannels = wav.fmt.numChannels;

  if (numChannels === 1) {
    return rawSamples;
  }

  // Mixage manuel stéréo -> mono : on moyenne chaque groupe de canaux
  // (la méthode toMono() n'existe pas dans la version installée de wavefile)
  console.log(`Conversion ${numChannels} canaux -> mono (mixage manuel)...`);
  const totalSamples = rawSamples.length / 2 / numChannels; // 2 bytes par sample (16-bit)
  const monoBuffer = Buffer.alloc(totalSamples * 2);

  for (let i = 0; i < totalSamples; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const offset = (i * numChannels + ch) * 2;
      sum += rawSamples.readInt16LE(offset);
    }
    const avg = Math.round(sum / numChannels);
    monoBuffer.writeInt16LE(avg, i * 2);
  }

  return monoBuffer;
}

async function main() {
  console.log("Connexion au Gemini Live API...");

  let sessionClosed = false;
  let fullTranscript = "";

  const session = await ai.live.connect({
    model: model,
    config: {
      responseModalities: [Modality.TEXT], // on veut du texte, pas une réponse vocale
      inputAudioTranscription: {}, // active la transcription de ce que dit l'utilisateur
    },
    callbacks: {
      onopen: () => console.log("✅ Session ouverte"),

      onmessage: (message) => {
        // Le champ réel s'appelle "interimInputTranscription" (transcription
        // provisoire qui se complète au fur et à mesure), pas "inputTranscription"
        const interim = message.serverContent?.interimInputTranscription?.text;
        if (interim) {
          fullTranscript = interim; // chaque message contient la version la plus à jour
          console.log("📝 Transcription (en cours):", interim);
        }

        if (message.serverContent?.turnComplete) {
          console.log("✅ Tour terminé. Transcription finale:", fullTranscript);
        }
      },

      onerror: (e) => console.error("❌ Erreur:", e.message),

      onclose: (e) => {
        console.log("🔒 Session fermée:", e.reason || "(pas de raison donnée)");
        sessionClosed = true;
      },
    },
  });

  // IMPORTANT: remplace "test-audio.wav" par un vrai fichier .wav présent dans ce dossier
  const AUDIO_FILE = "test-audio.wav";

  if (!fs.existsSync(AUDIO_FILE)) {
    console.error(`❌ Fichier "${AUDIO_FILE}" introuvable. Mets un fichier .wav dans ce dossier.`);
    process.exit(1);
  }

  console.log("Conversion de l'audio en PCM 16kHz mono...");
  const pcmData = convertToPCM16k(AUDIO_FILE);
  console.log(`Taille de l'audio converti: ${pcmData.length} bytes`);

  console.log("Envoi de l'audio à Gemini...");
  session.sendRealtimeInput({
    audio: {
      data: pcmData.toString("base64"),
      mimeType: "audio/pcm;rate=16000",
    },
  });

  // Signale explicitement la fin du tour de parole, pour que Gemini
  // sache qu'il doit traiter et répondre maintenant
  session.sendRealtimeInput({ audioStreamEnd: true });
  console.log("Signal de fin de flux envoyé, en attente de la réponse...");

  // Laisse le temps à Gemini de traiter avant de fermer la session
  setTimeout(() => {
    if (!sessionClosed) {
      console.log("Fermeture de la session (fin du test, 15s écoulées).");
      session.close();
    }
  }, 15000);
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});