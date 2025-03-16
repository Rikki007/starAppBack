const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000, // Минуты
  max: process.env.RATE_LIMIT_MAX,
  message: {
    error: 'Too many requests, please try again later'
  },
  headers: true
});