import rateLimit from 'express-rate-limit';

// Global limit: 100 requests per 15 minutes per IP
// Note: In a production environment with multiple server instances, 
// a Redis store (e.g., rate-limit-redis) must be configured here.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' }
});

// Stricter limit for the AI generation endpoint
export const createRoomLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Room creation rate limit exceeded. Max 5 rooms per 15 minutes.' }
});
