import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import * as repo from './roomRepository';
import { RoomModel } from '../models/Room';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await RoomModel.deleteMany({});
});

describe('RoomRepository', () => {
  const questions = [
    { text: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 1 },
    { text: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 2 },
    { text: 'Q3', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
    { text: 'Q4', options: ['A', 'B', 'C', 'D'], correctIndex: 3 },
    { text: 'Q5', options: ['A', 'B', 'C', 'D'], correctIndex: 1 }
  ];

  it('generates unique room code and creates a room', async () => {
    const code = await repo.generateUniqueRoomCode();
    expect(code).toMatch(/^[0-9]{4}$/);
    
    const room = await repo.createRoom(code, 'host-token', questions);
    expect(room.roomCode).toBe(code);
    expect(room.status).toBe('lobby');
  });

  it('prevents duplicate nicknames in addPlayer', async () => {
    await repo.createRoom('1111', 'host-token', questions);
    await repo.addPlayer('1111', 'Alex', 'socket-1');
    
    await expect(repo.addPlayer('1111', 'Alex', 'socket-2'))
      .rejects.toThrow('Nickname already in use');
  });

  it('updates host socket ID', async () => {
    await repo.createRoom('2222', 'host-token', questions);
    await repo.updateHostSocket('2222', 'new-host-socket');
    const room = await repo.findRoomByCode('2222');
    expect(room.hostSocketId).toBe('new-host-socket');
  });

  it('handles atomic double-answer submission correctly', async () => {
    await repo.createRoom('3333', 'host-token', questions);
    await repo.addPlayer('3333', 'Alex', 'socket-1');
    await repo.setRoomStatus('3333', 'playing');
    await repo.advanceQuestion('3333'); // advances to qIndex = 0

    // First submission (correct = index 1)
    const res = await repo.submitAnswer('3333', 'socket-1', 1);
    expect(res.correct).toBe(true);
    expect(res.points).toBe(100);

    // Concurrent/Second submission should fail
    await expect(repo.submitAnswer('3333', 'socket-1', 1))
      .rejects.toThrow('Player already answered this question');
  });

  it('allows reconnection of disconnected players', async () => {
    await repo.createRoom('4444', 'host-token', questions);
    await repo.addPlayer('4444', 'Bob', 'socket-old');
    
    // Disconnect
    await repo.removePlayer('4444', 'socket-old');
    const room = await repo.findRoomByCode('4444');
    expect(room.players[0].socketId).toBeNull();

    // Reconnect
    await repo.reconnectPlayer('4444', 'Bob', 'socket-new');
    const reconnected = await repo.findRoomByCode('4444');
    expect(reconnected.players[0].socketId).toBe('socket-new');
  });

  it('fetches leaderboard sorted by score', async () => {
    await repo.createRoom('5555', 'host-token', questions);
    await repo.addPlayer('5555', 'P1', 's1');
    await repo.addPlayer('5555', 'P2', 's2');
    
    await repo.setRoomStatus('5555', 'playing');
    await repo.advanceQuestion('5555');

    await repo.submitAnswer('5555', 's1', 1); // correct
    await repo.submitAnswer('5555', 's2', 0); // incorrect

    const leaderboard = await repo.getLeaderboard('5555');
    expect(leaderboard[0].nickname).toBe('P1');
    expect(leaderboard[0].score).toBe(100);
    expect(leaderboard[1].nickname).toBe('P2');
    expect(leaderboard[1].score).toBe(0);
  });
});
