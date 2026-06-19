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

describe('Socket.io Game Flow Integration', () => {
  it('runs full game flow, blocks unauthorized events, and prevents double answers', async () => {
    const questions = [
      { text: 'Q1', options: ['A','B','C','D'], correctIndex: 1 }
    ];
    const roomCode = '9999';
    const hostToken = 'host-123';
    await createRoom(roomCode, hostToken, questions);

    const hostSocket = createClient();
    const playerSocket = createClient();

    // 1. Host Join
    hostSocket.emit('host_join', { roomCode, hostToken });
    const hostJoined = await waitForEvent(hostSocket, 'host_joined');
    expect(hostJoined.questionCount).toBe(1);

    // 2. Join non-existent room
    const badPlayer = createClient();
    badPlayer.emit('player_join', { roomCode: '0000', nickname: 'Ghost' });
    const joinErr = await waitForEvent(badPlayer, 'error');
    expect(joinErr.message).toContain('Room does not exist');
    badPlayer.disconnect();

    // 3. Player Join
    playerSocket.emit('player_join', { roomCode, nickname: 'Alice' });
    const joinSuccess = await waitForEvent(playerSocket, 'join_success');
    expect(joinSuccess.nickname).toBe('Alice');

    // 4. Unauthorized Host Event from Player
    playerSocket.emit('host_start_game');
    const authErr = await waitForEvent(playerSocket, 'error');
    expect(authErr.message).toContain('Unauthorized');

    // 5. Host Starts Game
    hostSocket.emit('host_start_game');
    const qStart = await waitForEvent(playerSocket, 'question_started');
    expect(qStart.text).toBe('Q1');
    expect(qStart).not.toHaveProperty('correctIndex'); // MUST NOT leak correct answer

    // 6. Player answers correctly
    playerSocket.emit('player_submit_answer', { answerIndex: 1 });
    const ansRes = await waitForEvent(playerSocket, 'answer_result');
    expect(ansRes.correct).toBe(true);
    expect(ansRes.points).toBe(100);
    expect(ansRes.correctIndex).toBe(1); // Sent individually back to the player

    // 7. Double Answer fails safely
    playerSocket.emit('player_submit_answer', { answerIndex: 1 });
    const dblErr = await waitForEvent(playerSocket, 'error');
    expect(dblErr.message).toContain('already submitted');

    // 8. Host next question -> finishes game because only 1 question exists
    hostSocket.emit('host_next_question');
    const gameOver = await waitForEvent(playerSocket, 'game_over');
    expect(gameOver.finalLeaderboard[0].nickname).toBe('Alice');
    expect(gameOver.finalLeaderboard[0].score).toBe(100);

    hostSocket.disconnect();
    playerSocket.disconnect();
  });
});
