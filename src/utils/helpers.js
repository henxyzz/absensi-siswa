const formatDate = (date, locale = 'id-ID') => {
  return new Date(date).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (date, locale = 'id-ID') => {
  return new Date(date).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateTime = (date, locale = 'id-ID') => {
  return `${formatDate(date, locale)} ${formatTime(date, locale)}`;
};

const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const generateNIS = (year, classCode, sequence) => {
  return `${year}${classCode.toString().padStart(2, '0')}${sequence.toString().padStart(4, '0')}`;
};

const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
};

const parseWhatsAppNumber = (jid) => {
  return jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/<[^>]*>/g, '');
};

const generateRandomPassword = (length = 8) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

const paginateResults = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { skip, limit: parseInt(limit) };
};

const buildPaginationResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  getStartOfDay,
  getEndOfDay,
  generateNIS,
  formatPhoneNumber,
  parseWhatsAppNumber,
  sanitizeInput,
  generateRandomPassword,
  paginateResults,
  buildPaginationResponse
};
