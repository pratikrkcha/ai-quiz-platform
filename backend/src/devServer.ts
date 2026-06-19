import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createServer } from 'http';
import app from './app';
import { setupSocketServer } from './socket/socketServer';
import { env } from './config/env';

const start = async () => {
  console.log('Starting In-Memory MongoDB Server for Local Development...');
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  await mongoose.connect(uri);
  console.log(`Connected to In-Memory MongoDB at ${uri}`);

  const httpServer = createServer(app);
  setupSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`🚀 Development Backend Server listening on port ${env.PORT}`);
    console.log(`🔌 WebSockets and API ready at http://localhost:${env.PORT}`);
  });
};

start();
