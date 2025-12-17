const rateLimit = require('express-rate-limit');
const config = require('../config/config');

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Terlalu banyak request, coba lagi nanti'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimit.loginMax,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const whatsappLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Rate limit WhatsApp, tunggu sebentar'
  }
});

module.exports = {
  apiLimiter,
  loginLimiter,
  whatsappLimiter
};
