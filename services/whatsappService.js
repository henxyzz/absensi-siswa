const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { WhatsAppSession, Student, Profile } = require('../models');
const { formatPhoneNumber, parseWhatsAppNumber } = require('../utils/helpers');
const config = require('../config/config');

class WhatsAppService {
  constructor() {
    this.socket = null;
    this.status = 'disconnected';
    this.pairingCode = null;
    this.phoneNumber = null;
    this.io = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  setSocketIO(io) {
    this.io = io;
  }

  getStatus() {
    return {
      connected: this.status === 'connected',
      status: this.status,
      pairingCode: this.pairingCode,
      phoneNumber: this.phoneNumber
    };
  }

  async connect(phoneNumber) {
    try {
      this.phoneNumber = formatPhoneNumber(phoneNumber);
      this.status = 'connecting';

      const sessionPath = path.join(config.whatsapp.sessionPath, 'main');
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

      const logger = pino({ level: 'silent' });

      this.socket = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: false,
        logger,
        browser: ['School Attendance Bot', 'Chrome', '120.0.0'],
        generateHighQualityLinkPreview: true
      });

      if (!this.socket.authState.creds.registered) {
        this.status = 'pairing';
        this.pairingCode = await this.socket.requestPairingCode(this.phoneNumber);
        console.log(`Pairing code: ${this.pairingCode}`);

        await WhatsAppSession.findOneAndUpdate(
          { sessionId: 'main' },
          {
            status: 'pairing',
            pairingCode: this.pairingCode,
            phoneNumber: this.phoneNumber
          },
          { upsert: true, new: true }
        );

        if (this.io) {
          this.io.emit('whatsapp:pairing', { code: this.pairingCode });
        }
      }

      this.socket.ev.on('creds.update', saveCreds);

      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          
          this.status = 'disconnected';
          this.pairingCode = null;

          await WhatsAppSession.findOneAndUpdate(
            { sessionId: 'main' },
            {
              status: 'disconnected',
              lastDisconnected: new Date(),
              pairingCode: null
            }
          );

          if (this.io) {
            this.io.emit('whatsapp:disconnected');
          }

          if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
            setTimeout(() => this.connect(this.phoneNumber), 5000);
          }
        } else if (connection === 'open') {
          this.status = 'connected';
          this.pairingCode = null;
          this.reconnectAttempts = 0;

          await WhatsAppSession.findOneAndUpdate(
            { sessionId: 'main' },
            {
              status: 'connected',
              lastConnected: new Date(),
              pairingCode: null,
              phoneNumber: this.phoneNumber
            },
            { upsert: true }
          );

          console.log('WhatsApp connected successfully');

          if (this.io) {
            this.io.emit('whatsapp:connected');
          }
        }
      });

      this.socket.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
          if (!msg.key.fromMe && msg.message) {
            await this.handleIncomingMessage(msg);
          }
        }
      });

      return {
        status: this.status,
        pairingCode: this.pairingCode
      };

    } catch (error) {
      console.error('WhatsApp connect error:', error);
      this.status = 'disconnected';
      throw error;
    }
  }

  async disconnect() {
    if (this.socket) {
      await this.socket.logout();
      this.socket = null;
    }
    this.status = 'disconnected';
    this.pairingCode = null;

    const sessionPath = path.join(config.whatsapp.sessionPath, 'main');
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    await WhatsAppSession.findOneAndUpdate(
      { sessionId: 'main' },
      {
        status: 'disconnected',
        lastDisconnected: new Date(),
        pairingCode: null
      }
    );
  }

  async sendMessage(to, message, type = 'text') {
    if (!this.socket || this.status !== 'connected') {
      throw new Error('WhatsApp tidak terhubung');
    }

    const jid = `${formatPhoneNumber(to)}@s.whatsapp.net`;

    try {
      let result;
      if (type === 'text') {
        result = await this.socket.sendMessage(jid, { text: message });
      } else if (type === 'image') {
        result = await this.socket.sendMessage(jid, { 
          image: { url: message.url },
          caption: message.caption || ''
        });
      }

      await WhatsAppSession.findOneAndUpdate(
        { sessionId: 'main' },
        { $inc: { messagesSent: 1 } }
      );

      return result;
    } catch (error) {
      console.error('Send message error:', error);
      throw new Error('Gagal mengirim pesan');
    }
  }

  async handleIncomingMessage(msg) {
    try {
      const from = parseWhatsAppNumber(msg.key.remoteJid);
      const text = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text || '';

      await WhatsAppSession.findOneAndUpdate(
        { sessionId: 'main' },
        { $inc: { messagesReceived: 1 } }
      );

      if (text.toLowerCase().startsWith('/')) {
        await this.handleCommand(from, text.toLowerCase());
      }

    } catch (error) {
      console.error('Handle message error:', error);
    }
  }

  async handleCommand(from, command) {
    const jid = `${from}@s.whatsapp.net`;
    const args = command.split(' ');
    const cmd = args[0];

    switch (cmd) {
      case '/help':
        await this.socket.sendMessage(jid, {
          text: `*Sistem Absensi Sekolah Bot*\n\nPerintah tersedia:\n/help - Bantuan\n/status - Status absensi hari ini\n/izin [alasan] - Ajukan izin\n/sakit [alasan] - Ajukan sakit\n/info - Informasi akun`
        });
        break;

      case '/status':
        const student = await Student.findOne({ whatsappNumber: from }).populate('classId');
        if (student) {
          await this.socket.sendMessage(jid, {
            text: `*Status Absensi*\nNama: ${student.fullName}\nKelas: ${student.classId?.name || '-'}\nNIS: ${student.nis}`
          });
        } else {
          await this.socket.sendMessage(jid, {
            text: 'Nomor WhatsApp tidak terdaftar dalam sistem.'
          });
        }
        break;

      case '/info':
        const profile = await Profile.findOne({ whatsappNumber: from });
        if (profile) {
          await this.socket.sendMessage(jid, {
            text: `*Informasi Akun*\nNama: ${profile.fullName}\nID: ${profile.uniqueId}\nRole: ${profile.role}\nStatus: ${profile.status}`
          });
        } else {
          await this.socket.sendMessage(jid, {
            text: 'Nomor WhatsApp tidak terdaftar dalam sistem.'
          });
        }
        break;

      default:
        await this.socket.sendMessage(jid, {
          text: 'Perintah tidak dikenal. Ketik /help untuk bantuan.'
        });
    }
  }

  async sendAttendanceNotification(studentId, status, className) {
    try {
      const student = await Student.findById(studentId);
      if (!student) return;

      const message = `*Notifikasi Absensi*\n\nNama: ${student.fullName}\nKelas: ${className}\nStatus: ${status.toUpperCase()}\nWaktu: ${new Date().toLocaleString('id-ID')}\n\nSistem Absensi Sekolah`;

      if (student.whatsappNumber) {
        await this.sendMessage(student.whatsappNumber, message);
      }

      if (student.parentWhatsapp) {
        await this.sendMessage(student.parentWhatsapp, message);
      }
    } catch (error) {
      console.error('Send attendance notification error:', error);
    }
  }

  async sendPermissionNotification(permission, type) {
    try {
      const student = await Student.findById(permission.studentId);
      if (!student) return;

      let message = '';
      if (type === 'submitted') {
        message = `*Pengajuan ${permission.type.toUpperCase()}*\n\nNama: ${student.fullName}\nTanggal: ${permission.startDate.toLocaleDateString('id-ID')} - ${permission.endDate.toLocaleDateString('id-ID')}\nAlasan: ${permission.reason}\n\nMenunggu persetujuan.`;
      } else if (type === 'approved') {
        message = `*Pengajuan DISETUJUI*\n\nPengajuan ${permission.type} untuk ${student.fullName} telah disetujui.`;
      } else if (type === 'rejected') {
        message = `*Pengajuan DITOLAK*\n\nPengajuan ${permission.type} untuk ${student.fullName} ditolak.\nAlasan: ${permission.rejectionReason}`;
      }

      if (student.whatsappNumber) {
        await this.sendMessage(student.whatsappNumber, message);
      }

      if (student.parentWhatsapp) {
        await this.sendMessage(student.parentWhatsapp, message);
      }
    } catch (error) {
      console.error('Send permission notification error:', error);
    }
  }
}

const whatsappService = new WhatsAppService();

module.exports = whatsappService;
