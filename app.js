require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { generatePrediction } = require('./utils/ai-generator');
const cache = require('./config/cache');
const logger = require('./utils/logger');
const rateLimit = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Конфигурация
const PREDICTIONS_PATH = path.join(__dirname, 'data', 'predictions.json');
const FALLBACK_PATH = path.join(__dirname, 'data', 'fallback.json');
const ZODIAC_SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 
                     'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

// Мидлвары
app.use(bodyParser.json());
app.use(helmet());
app.use(cors({
  origin: 'http://127.0.0.1:5500',
  credentials: true
}));
app.use(rateLimit);
app.use(logger.middleware);

// Хелперы
const loadJSON = async (filePath) => {
  try {
    const data = await fs.readFile(filePath);
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error loading ${filePath}: ${error.message}`);
    return [];
  }
};

const updatePredictions = async (sign, newData) => {
  try {
    const predictions = await loadJSON(PREDICTIONS_PATH);
    const index = predictions.findIndex(p => p.sign === sign);
    
    if (index > -1) predictions[index] = { ...predictions[index], ...newData };
    else predictions.push({ sign, ...newData });

    await fs.writeFile(PREDICTIONS_PATH, JSON.stringify(predictions, null, 2));
    cache.del(sign); // Инвалидация кэша
  } catch (error) {
    logger.error(`Update error: ${error.message}`);
  }
};

// Роуты
app.post('/api/starAppBack', async (req, res, next) => {
  try {
    const { todayDate, sign } = req.body;
    const lowerSign = sign.toLowerCase();

    // Валидация
    if (!ZODIAC_SIGNS.includes(lowerSign)) {
      return res.status(400).json({ error: 'Invalid zodiac sign' });
    }
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(todayDate)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Проверка кэша
    const cacheKey = `${lowerSign}_${todayDate}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    // Поиск в существующих данных
    const predictions = await loadJSON(PREDICTIONS_PATH);
    const existing = predictions.find(p => 
      p.sign === lowerSign && p.date === todayDate
    );

    if (existing) {
      cache.set(cacheKey, existing);
      return res.json(existing);
    }

    // Генерация нового предсказания
    let newPrediction;
    try {
      newPrediction = await generatePrediction(lowerSign);
    } catch (aiError) {
      logger.warn(`AI failed, using fallback: ${aiError.message}`);
      const fallback = await loadJSON(FALLBACK_PATH);
      newPrediction = fallback[lowerSign] || "Special energies are at play today";
    }

    // Сохранение и ответ
    const result = {
      sign: lowerSign,
      date: todayDate,
      prediction: newPrediction
    };

    await updatePredictions(lowerSign, result);
    cache.set(cacheKey, result);
    
    res.json(result);

  } catch (error) {
    next(error);
  }
});

// Обработка ошибок
app.use(errorHandler);

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});