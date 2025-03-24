const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const { getRandomInt } = require("../logic/randomizer.js");

const RATING_PATH = path.join(__dirname, "../data", "raiting.json");

const loadJSON = async (filePath) => {
  try {
    const data = await fs.readFile(filePath);
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return {};
  }
};

async function generatePrediction(sign) {
  try {
    const rating = await loadJSON(RATING_PATH); // Загружаем рейтинги

    // Генерируем случайные числа (1-10)
    const moodRating = getRandomInt();
    const loveRating = getRandomInt();
    const careerRating = getRandomInt();
    const healthRating = getRandomInt();

    // Получаем текстовые описания из JSON
    const moodText = rating[moodRating.toString()] || 'Unknown';
    const loveText = rating[loveRating.toString()] || 'Unknown';
    const careerText = rating[careerRating.toString()] || 'Unknown';
    const healthText = rating[healthRating.toString()] || 'Unknown';

    const prompt = `
      Напиши гороскоп для ${sign} на сегодня. 
      Учти следующие аспекты:
      - Общее настроение дня: ${moodText}.
      - Любовь и отношения: ${loveText}.
      - Карьера и финансы: ${careerText}.
      - Здоровье: ${healthText}.
      Оформи в мистическом стиле. В конце добавь ОДИН главный совет от звёзд (1-2 предложения) без нумерации. Ответ на русском.
    `;

    const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Mistral AI Error:', error.response?.data || error.message);
    return "Звёзды сегодня безмолвствуют. Прислушайся к внутреннему голосу...";
  }
}

module.exports = { generatePrediction };