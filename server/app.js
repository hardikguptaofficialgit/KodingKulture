import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.routes.js';
import contestRoutes from './routes/contest.routes.js';
import mcqRoutes from './routes/mcq.routes.js';
import codingRoutes from './routes/coding.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import adminRoutes from './routes/admin.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import formRoutes from './routes/form.routes.js';
import formSubmissionRoutes from './routes/formSubmission.routes.js';
import roomRoutes from './routes/room.routes.js';

// Import middleware
import { errorHandler } from './middlewares/error.middleware.js';
import { apiLimiter, speedLimiter } from './middlewares/security.middleware.js';

dotenv.config();

const app = express();

// ===========================================
// SECURITY MIDDLEWARE (Order Matters!)
// ===========================================

// 1. CORS - must be before other middleware
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours - reduce preflight requests
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 2. Helmet - Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.CLIENT_URL || 'http://localhost:5173'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// 3. Body parser with size limits
app.use(express.json({ limit: '10kb' })); // Limit body size to 10kb
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4. Data sanitization against NoSQL injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[SECURITY] Sanitized field: ${key} from ${req.ip}`);
  }
}));

// 5. Prevent HTTP Parameter Pollution
app.use(hpp({
  whitelist: ['status', 'difficulty', 'category', 'page', 'limit', 'sort']
}));

// 6. Global rate limiting + speed limiter
app.use('/api', apiLimiter);
app.use('/api', speedLimiter);

// ===========================================
// API ROUTES
// ===========================================

app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/mcq', mcqRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/form-submissions', formSubmissionRoutes);
app.use('/api/rooms', roomRoutes);

// ===========================================
// UTILITY ROUTES
// ===========================================

// Health check (no rate limit)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use(errorHandler);

export default app;
