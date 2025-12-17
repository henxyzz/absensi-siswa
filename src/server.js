require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const config = require('./config/config');
const connectDB = require('./config/database');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimit');
const { bootstrapAdmin } = require('./controllers/authController');
const notificationService = require('./services/notificationService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('trust proxy', true)

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', apiLimiter, routes);

app.set('io', io);
notificationService.setSocketIO(io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join:class', (classId) => {
    socket.join(`class:${classId}`);
  });

  socket.on('leave:class', (classId) => {
    socket.leave(`class:${classId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan server'
  });
});

const startServer = () => {
  try {
    const dbConnected = connectDB() // ❗ TANPA await

    if (dbConnected) {
      console.log('Database init triggered')
      bootstrapAdmin()
    } else {
      console.log('Starting server without database (demo mode)')
    }

    server.listen(config.app.port, '0.0.0.0', () => {
      console.log(`Server running on port ${config.app.port}`)
      console.log(`Environment: ${config.app.env}`)
      console.log(`Open http://localhost:${config.app.port}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

module.exports = startServer

startServer();

module.exports = { app, server, io };
