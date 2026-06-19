import app from './app';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { env } from './config/env';
import { setupSocketServer } from './socket/socketServer';

const httpServer = createServer(app);
setupSocketServer(httpServer);

const startServer = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      await mongoose.connect(env.MONGODB_URI);
      console.log('Connected to MongoDB');
      break;
    } catch (err) {
      console.error(`MongoDB connection failed. Retries left: ${retries - 1}`);
      retries -= 1;
      if (retries === 0) process.exit(1);
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  const server = httpServer.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    server.close(() => console.log('HTTP server closed'));
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();
