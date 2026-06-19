import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'http';
import { setupSocketServer } from '../../src/socket/socketServer';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createRoom } from '../../src/dal/roomRepository';

let mongoServer: MongoMemoryServer;
let ioServer: any;
let httpServer: any;
let port: number;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  httpServer = createServer();
  ioServer = setupSocketServer(httpServer);
  
  await new Promise<void>((resolve) => {
    httpServer.listen(() => {
      port = (httpServer.address() as any).port;
      resolve();
    });
  });
});

afterAll(async () => {
  ioServer.close();
  httpServer.close();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

const createClient = (): ClientSocket => {
  return Client(`http://localhost:${port}`);
};

const waitForEvent = (client: ClientSocket, event: string) => {
  return new Promise<any>((resolve) => client.once(event, resolve));
};

describe('Security Hardening Tests', () => {
  it('prevents XSS via nickname by rejecting non-alphanumeric characters', async () => {
    const playerSocket = createClient();
    playerSocket.emit('player_join', { roomCode: '9999', nickname: '<script>alert(1)</script>' });
    
    const err = await waitForEvent(playerSocket, 'error');
    expect(err.message).toContain('Alphanumeric and spaces only'); // Zod rejection
    playerSocket.disconnect();
  });

  it('prevents NoSQL injection in roomCode (Zod intercepts object structure)', async () => {
    const playerSocket = createClient();
    // Sending an object to a socket where string is expected replicates NoSQL attack payload
    playerSocket.emit('player_join', { roomCode: { $gt: "" }, nickname: 'Hacker' });
    
    const err = await waitForEvent(playerSocket, 'error');
    expect(err.message).toBeDefined(); // Will throw a Zod parsing validation error, stopping the attack
    playerSocket.disconnect();
  });

  it('prevents participant from emitting host events (Elevation of Privilege)', async () => {
    await createRoom('1111', 'host-token', [{ text: 'Q1', options: ['A','B','C','D'], correctIndex: 1 }]);
    const playerSocket = createClient();
    playerSocket.emit('player_join', { roomCode: '1111', nickname: 'Alice' });
    await waitForEvent(playerSocket, 'join_success');

    // Attempt exploit
    playerSocket.emit('host_start_game');
    const authErr = await waitForEvent(playerSocket, 'error');
    expect(authErr.message).toContain('Unauthorized');
    playerSocket.disconnect();
  });

  it('enforces socket event rate limit for submit_answer preventing DB DoS', async () => {
    await createRoom('2222', 'host-token', [{ text: 'Q1', options: ['A','B','C','D'], correctIndex: 1 }]);
    const hostSocket = createClient();
    hostSocket.emit('host_join', { roomCode: '2222', hostToken: 'host-token' });
    await waitForEvent(hostSocket, 'host_joined');
    hostSocket.emit('host_start_game');

    const playerSocket = createClient();
    playerSocket.emit('player_join', { roomCode: '2222', nickname: 'Spammer' });
    await waitForEvent(playerSocket, 'question_started'); // wait until game starts

    let errorCount = 0;
    playerSocket.on('error', (err) => {
      if (err.message.includes('Rate limit exceeded')) errorCount++;
    });

    // Spam 15 requests instantly (limit is 5/sec)
    for (let i = 0; i < 15; i++) {
      playerSocket.emit('player_submit_answer', { answerIndex: 1 });
    }

    // Yield to let server process
    await new Promise(res => setTimeout(res, 500));
    
    // The limit is 5/sec. So at least 10 should be explicitly blocked by the rate limiter.
    expect(errorCount).toBeGreaterThanOrEqual(9);

    playerSocket.disconnect();
    hostSocket.disconnect();
  });
});
