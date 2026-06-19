import { cleanEnv, str, port, url } from 'envalid';
import dotenv from 'dotenv';
import path from 'path';
// __dirname is globally available in CommonJS
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Envalid will immediately throw and crash the process if any of these are missing on startup.
export const env = cleanEnv(process.env, {
  PORT: port({ default: 4000 }),
  MONGODB_URI: str({ default: 'mongodb://localhost:27017/quiz-builder' }),
  GEMINI_API_KEY: str(),
  FRONTEND_URL: url({ default: 'http://localhost:5173' }),
  NODE_ENV: str({ default: 'development' })
});
