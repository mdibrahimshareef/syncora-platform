require('dotenv').config({ path: '.env.local' });

async function listModels() {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`);
  const data = await response.json();
  console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
}

listModels();
