const whatsappService = require('../services/whatsappService');
const { WhatsAppSession } = require('../models');
const { logFromRequest } = require('../utils/auditLogger');

const getStatus = async (req, res) => {
  try {
    const session = await WhatsAppSession.findOne({ sessionId: 'main' });
    const serviceStatus = whatsappService.getStatus();

    res.json({
      success: true,
      data: {
        connected: serviceStatus.connected,
        status: serviceStatus.status,
        phoneNumber: session?.phoneNumber || null,
        lastConnected: session?.lastConnected || null,
        pairingCode: serviceStatus.pairingCode,
        stats: {
          messagesSent: session?.messagesSent || 0,
          messagesReceived: session?.messagesReceived || 0
        }
      }
    });
  } catch (error) {
    console.error('Get WA status error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const connect = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Nomor telepon wajib diisi' });
    }

    const result = await whatsappService.connect(phoneNumber);

    await logFromRequest(req, 'WA_BOT_CONNECTED', 'WhatsApp', null, 
      `WhatsApp bot connecting dengan nomor ${phoneNumber}`);

    res.json({
      success: true,
      message: 'Memulai koneksi WhatsApp',
      data: result
    });
  } catch (error) {
    console.error('Connect WA error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const disconnect = async (req, res) => {
  try {
    await whatsappService.disconnect();

    await logFromRequest(req, 'WA_BOT_DISCONNECTED', 'WhatsApp', null, 
      'WhatsApp bot disconnected');

    res.json({
      success: true,
      message: 'WhatsApp berhasil diputuskan'
    });
  } catch (error) {
    console.error('Disconnect WA error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { to, message, type = 'text' } = req.body;

    if (!to || !message) {
      return res.status(400).json({ success: false, message: 'Nomor tujuan dan pesan wajib diisi' });
    }

    const result = await whatsappService.sendMessage(to, message, type);

    await logFromRequest(req, 'WA_MESSAGE_SENT', 'WhatsApp', null, 
      `Pesan terkirim ke ${to}`);

    res.json({
      success: true,
      message: 'Pesan berhasil dikirim',
      data: result
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSessions = async (req, res) => {
  try {
    const sessions = await WhatsAppSession.find().sort({ updatedAt: -1 });
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = {
  getStatus,
  connect,
  disconnect,
  sendMessage,
  getSessions
};
