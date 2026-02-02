require('dotenv').config();
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const { initSocket } = require('./socket');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"]
    }
  }
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || "https://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Create server (HTTPS in production, HTTP in development)
let server;
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production' && process.env.HTTPS_ENABLED === 'true') {
  // HTTPS configuration
  const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || path.join(__dirname, 'ssl/key.pem')),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || path.join(__dirname, 'ssl/cert.pem'))
  };
  server = https.createServer(httpsOptions, app);
  console.log('🔒 HTTPS Server enabled');
} else {
  server = http.createServer(app);
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Warning: Running in production without HTTPS');
  }
}

// Initialize Socket.IO
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});
initSocket(io);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 HTTPS: ${process.env.HTTPS_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
