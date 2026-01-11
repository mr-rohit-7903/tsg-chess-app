require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { connectMongo } = require('./lib/db');
const { initSocket } = require('./services/socket-service');

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const matchmakingRoutes = require('./routes/matchmaking');
const gameRoutes = require('./routes/games');
const leaderboardRoutes = require('./routes/leaderboard');
const ratingRoutes = require('./routes/ratings');

const PORT = process.env.PORT || 3001;
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081'];

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${duration}ms`);
  });
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/matchmaking', matchmakingRoutes);
app.use('/games', gameRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/ratings', ratingRoutes);

// Health
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'unified-backend' }));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start
const startServer = async () => {
  await connectMongo();
  initSocket(server, allowedOrigins);

  server.listen(PORT, () => {
    console.log(`✅ Unified backend running on port ${PORT}`);
    console.log(`✅ Socket.IO server attached`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
