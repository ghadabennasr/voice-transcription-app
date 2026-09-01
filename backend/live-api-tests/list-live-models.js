// Petit utilitaire : liste les modèles réellement disponibles pour TA clé API
// qui supportent le Live API (bidiGenerateContent). Utile car les noms de
// modèles changent souvent — mieux vaut vérifier que deviner.

require("dotenv").config();

const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  const data = await response.json();

  console.log("Modèles supportant le Live API (bidiGenerateContent) :\n");

  const liveModels = data.models.filter((m) =>
    m.supportedGenerationMethods?.includes("bidiGenerateContent")
  );

  if (liveModels.length === 0) {
    console.log("Aucun modèle Live trouvé pour cette clé API.");
  } else {
    liveModels.forEach((m) => console.log("-", m.name));
  }
}

listModels();