const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
require('dotenv').config();

// Import database configuration
const { sequelize, testConnection, syncDatabase } = require('./config/database');

// Import models to set up associations
require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const subscriptionRoutes = require('./routes/subscription');
const twoFactorRoutes = require('./routes/twoFactor');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const logger = require('./utils/logger');

const app = express();

// Trust proxy for rate limiting behind reverse proxy (aaPanel/Nginx)
app.set('trust proxy', 1);

// Security middleware - Dioptimalkan untuk API Cross-Subdomain
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // API biasanya tidak perlu CSP ketat seperti Frontend
}));

// --- FIXED CORS CONFIGURATION ---
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'https://autofile.raymaizing.com',
  'https://raymaizing.com',
  'http://localhost:3000',
  'http://localhost:8080'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Izinkan jika tidak ada origin (Postman/Mobile) atau ada di list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚨 CORS Blocked for: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : parseInt(process.env.RATE_LIMIT_MAX || 1000),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.'
    });
  }
});
app.use(limiter);

// --- FIXED SLOW DOWN (v2.x Syntax) ---
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500;
  },
  maxDelayMs: 20000,
});
app.use(speedLimiter);

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try { JSON.parse(buf); } catch (e) {
      res.status(400).json({ success: false, message: 'Invalid JSON format' });
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/2fa', twoFactorRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ success: true, message: 'RAYMAIZING API Server Online' });
});

// 404 & Error Handler
app.use(notFound);
app.use(errorHandler);

// Database Initialization
const initializeDatabase = async () => {
  try {
    const isConnected = await testConnection();
    if (!isConnected) throw new Error('Database connection failed');
    await syncDatabase(false); 
    console.log('✅ Database initialized');
    return true;
  } catch (error) {
    console.error('❌ Database error:', error);
    return false;
  }
};

// Start Server
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  if (await initializeDatabase()) {
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    });
  }
};

startServer();

module.exports = app;