import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { env } from './config/env';
import { roomRouter } from './routes/roomRoutes';
import { errorHandler } from './middlewares/errorMiddleware';
import { globalLimiter } from './middlewares/rateLimiter';
import { logger } from './utils/logger';

const app = express();

// Assign UUID Request ID for traceability
app.use((req, res, next) => {
  (req as any).id = uuidv4();
  next();
});

// Production Health Check (Excluded from access logging to prevent LB spam)
app.get('/health', (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const isLLMKeyPresent = !!env.GEMINI_API_KEY;
  
  if (isMongoConnected && isLLMKeyPresent) {
    res.status(200).json({ status: 'healthy', mongodb: 'connected', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ 
      status: 'unhealthy', 
      reason: !isMongoConnected ? 'MongoDB disconnected' : 'LLM API key missing' 
    });
  }
});

// Structured JSON Logging
app.use(pinoHttp({ 
  logger,
  customProps: (req) => ({ requestId: (req as any).id }),
  autoLogging: { ignore: (req) => req.url === '/health' } // Ignore ELB pings
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", env.FRONTEND_URL, "http://localhost:5173", "http://localhost:4000", "ws:", "wss:"],
      imgSrc: ["'self'", "data:"],
      workerSrc: ["'self'", "blob:"],
      frameAncestors: ["'none'"],
    }
  }
}));

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(globalLimiter);

app.use('/api/rooms', roomRouter);

app.use(errorHandler);

export default app;
