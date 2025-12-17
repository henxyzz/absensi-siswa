const mongoose = require('mongoose');

const whatsappSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    default: 'main'
  },
  phoneNumber: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['disconnected', 'connecting', 'connected', 'pairing'],
    default: 'disconnected'
  },
  pairingCode: {
    type: String,
    default: null
  },
  lastConnected: {
    type: Date,
    default: null
  },
  lastDisconnected: {
    type: Date,
    default: null
  },
  qrAttempts: {
    type: Number,
    default: 0
  },
  messagesSent: {
    type: Number,
    default: 0
  },
  messagesReceived: {
    type: Number,
    default: 0
  },
  errorCount: {
    type: Number,
    default: 0
  },
  lastError: {
    type: String,
    default: null
  },
  settings: {
    autoReply: { type: Boolean, default: true },
    notifyAttendance: { type: Boolean, default: true },
    notifyPermission: { type: Boolean, default: true },
    notifyGeofence: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WhatsAppSession', whatsappSessionSchema);
