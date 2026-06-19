import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'http';
import { setupSocketServer } from '../../src/socket/socketServer';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createRoom } from '../../src/dal/roomRepository';
import app from '../../src/app';

let mongoServer: MongoMemoryServer;
let ioServer: any;
let httpServer: any;
let port: number;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  httpServer = createServer(app);
  ioServer = setupSocketServer(httpServer);
  
  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
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

describe('End-to-End Game Lifecycle Integration Tests', () => {

  it('Happy Path - Complete Game Simulation', async () => {
    const room = await createRoom('ABCD', 'host123', [
      { text: 'Q1', options: ['A','B','C','D'], correctIndex: 0 }
    ]);
    
    const host = createClient();
    host.emit('host_join', { roomCode: 'ABCD', hostToken: 'host123' });
    await waitForEvent(host, 'host_joined');

    const p1 = createClient();
    const p2 = createClient();
    const p3 = createClient();

    p1.emit('player_join', { roomCode: 'ABCD', nickname: 'P1' });
    p2.emit('player_join', { roomCode: 'ABCD', nickname: 'P2' });
    p3.emit('player_join', { roomCode: 'ABCD', nickname: 'P3' });

    await Promise.all([
      waitForEvent(p1, 'join_success'),
      waitForEvent(p2, 'join_success'),
      waitForEvent(p3, 'join_success')
    ]);

    // Host starts game
    host.emit('host_start_game');
    await waitForEvent(p1, 'question_started');

    // All submit correctly (correctIndex is 0)
    p1.emit('player_submit_answer', { answerIndex: 0 });
    p2.emit('player_submit_answer', { answerIndex: 0 });
    p3.emit('player_submit_answer', { answerIndex: 0 });

    const p1Res = await waitForEvent(p1, 'answer_result');
    expect(p1Res.correct).toBe(true);

    // Wait for question closure and timer resolving
    const hostRes = await waitForEvent(host, 'question_closed');
    expect(hostRes.leaderboard.length).toBe(3);
    
    // Host advances and ends game
    host.emit('host_next_question');
    const gameOver = await waitForEvent(p1, 'game_over');
    expect(gameOver.leaderboard[0].score).toBeGreaterThan(0);

    host.disconnect();
    p1.disconnect();
    p2.disconnect();
    p3.disconnect();
  });

  it('Concurrent Answer Submission Resiliency', async () => {
    const room = await createRoom('CONC', 'host123', [
      { text: 'Q1', options: ['A','B','C','D'], correctIndex: 1 }
    ]);

    const host = createClient();
    host.emit('host_join', { roomCode: 'CONC', hostToken: 'host123' });
    await waitForEvent(host, 'host_joined');

    const players = Array.from({ length: 10 }).map(() => createClient());
    
    await Promise.all(players.map((p, i) => {
      p.emit('player_join', { roomCode: 'CONC', nickname: `P${i}` });
      return waitForEvent(p, 'join_success');
    }));

    host.emit('host_start_game');
    await waitForEvent(players[0], 'question_started');

    // 10 simulated users emit at exactly the same microsecond via Promise.all
    const answerPromises = players.map(p => {
      p.emit('player_submit_answer', { answerIndex: 1 }); // All correct
      return waitForEvent(p, 'answer_result');
    });

    const results = await Promise.all(answerPromises);
    expect(results.length).toBe(10);
    expect(results.every(r => r.correct === true)).toBe(true); // Every single one successfully tracked

    const closedEvent = await waitForEvent(host, 'question_closed');
    expect(closedEvent.leaderboard.length).toBe(10);
    
    // All should have valid point values > 0 without Mongo lock collisions
    expect(closedEvent.leaderboard.every((l: any) => l.score > 0)).toBe(true);

    players.forEach(p => p.disconnect());
    host.disconnect();
  });

  it('Player Disconnect and Reconnect Preservation', async () => {
    const room = await createRoom('RECO', 'host123', [
      { text: 'Q1', options: ['A','B','C','D'], correctIndex: 2 }
    ]);
    
    let p1 = createClient();
    p1.emit('player_join', { roomCode: 'RECO', nickname: 'Alice' });
    await waitForEvent(p1, 'join_success');

    const host = createClient();
    host.emit('host_join', { roomCode: 'RECO', hostToken: 'host123' });
    await waitForEvent(host, 'host_joined');

    host.emit('host_start_game');
    await waitForEvent(p1, 'question_started');

    p1.emit('player_submit_answer', { answerIndex: 2 });
    const res = await waitForEvent(p1, 'answer_result');
    expect(res.correct).toBe(true);

    // Alice loses connection/drops internet
    p1.disconnect();

    // Alice reconnects with a fresh socket connection but same identifiers
    const p1Reconnected = createClient();
    p1Reconnected.emit('player_join', { roomCode: 'RECO', nickname: 'Alice' });
    const joinRes = await waitForEvent(p1Reconnected, 'join_success');

    // Score must be preserved completely from Mongo
    expect(joinRes.currentScore).toBeGreaterThan(0);
    expect(joinRes.currentScore).toBe(res.points);
    
    p1Reconnected.disconnect();
    host.disconnect();
  });

  it('Host Disconnect emits host_disconnected', async () => {
    const room = await createRoom('HDRO', 'host123', [
      { text: 'Q1', options: ['A','B','C','D'], correctIndex: 0 }
    ]);

    const host = createClient();
    host.emit('host_join', { roomCode: 'HDRO', hostToken: 'host123' });
    await waitForEvent(host, 'host_joined');

    const p1 = createClient();
    p1.emit('player_join', { roomCode: 'HDRO', nickname: 'Bob' });
    await waitForEvent(p1, 'join_success');

    // Host accidentally closes tab
    host.disconnect();

    // Bob receives event
    const hostDrop = await waitForEvent(p1, 'host_disconnected');
    expect(hostDrop).toBeDefined();

    p1.disconnect();
  });

  it('Answer Submission Idempotency (Spam Protection)', async () => {
    const room = await createRoom('IDEM', 'host123', [
      { text: 'Q1', options: ['A','B','C','D'], correctIndex: 0 }
    ]);

    const host = createClient();
    host.emit('host_join', { roomCode: 'IDEM', hostToken: 'host123' });
    await waitForEvent(host, 'host_joined');
    host.emit('host_start_game');

    const p1 = createClient();
    p1.emit('player_join', { roomCode: 'IDEM', nickname: 'Spammer' });
    await waitForEvent(p1, 'question_started');

    // Emit 5 rapid-fire submissions maliciously bypassing client UI
    for (let i = 0; i < 5; i++) {
      p1.emit('player_submit_answer', { answerIndex: 0 });
    }

    // Wait for the single valid answer_result
    const res = await waitForEvent(p1, 'answer_result');
    expect(res.correct).toBe(true);

    // Any subsequent emissions hit either the DB idempotent lock or rate limit returning an error
    const err = await waitForEvent(p1, 'error');
    expect(err.message).toMatch(/already answered|Rate limit exceeded/i);

    p1.disconnect();
    host.disconnect();
  });
});
