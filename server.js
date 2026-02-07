const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
require('dotenv').config();

const { sequelize, testConnection, syncDatabase } = require('./config/database');
require('./models');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const subscriptionRoutes = require('./routes/subscription');
// const twoFactorRoutes = require('./routes/twoFactor');

const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const logger = require('./utils/logger');

const app = express();
app.set('trust proxy', 1);

// HELMET - Dibuat tidak agresif
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// CORS - PAKSA IZINKAN SEMUA (Brute Force)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(compression());
if (process.env.NODE_ENV === 'development') { app.use(morgan('dev')); }

// RATE LIMIT
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Longgar dulu untuk testing
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// SLOW DOWN - Perbaikan Sintaks v2 agar tidak warning
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500;
  }
});
app.use(speedLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/subscription', subscriptionRoutes);
// app.use('/api/2fa', twoFactorRoutes);

app.get('/', (req, res) => res.json({ success: true, message: 'API LIVE' }));

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await testConnection();
    await syncDatabase(false);
    app.listen(process.env.PORT || 5001, '0.0.0.0', () => {
      console.log(`🚀 SERVER RUNNING ON PORT ${process.env.PORT || 5001}`);
    });
  } catch (e) {
    console.error(e);
  }
};

startServer();