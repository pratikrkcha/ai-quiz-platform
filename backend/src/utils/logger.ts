import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label) => {
      return { level: label }; // Output {"level": "info"} instead of standard numerical levels
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
