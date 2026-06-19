import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as llmService from '../../src/services/llmService';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  vi.clearAllMocks();
});

describe('POST /api/rooms Integration', () => {
  it('creates a room successfully on valid topic', async () => {
    vi.spyOn(llmService, 'generateQuestions').mockResolvedValue([
      { text: 'Q1', options: ['A','B','C','D'], correctIndex: 1 },
      { text: 'Q2', options: ['A','B','C','D'], correctIndex: 1 },
      { text: 'Q3', options: ['A','B','C','D'], correctIndex: 1 },
      { text: 'Q4', options: ['A','B','C','D'], correctIndex: 1 },
      { text: 'Q5', options: ['A','B','C','D'], correctIndex: 1 }
    ]);

    const res = await request(app).post('/api/rooms').send({ topic: 'Science' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('roomCode');
    expect(res.body).toHaveProperty('hostToken');
    expect(res.body.questionCount).toBe(5);
  });

  it('returns 400 for empty topic', async () => {
    const res = await request(app).post('/api/rooms').send({ topic: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid topic');
  });

  it('returns 400 for prompt injection attempt', async () => {
    vi.spyOn(llmService, 'generateQuestions').mockRejectedValue(
      new llmService.QuizGenerationError('Topic contains restricted phrases', false, true)
    );

    const res = await request(app).post('/api/rooms').send({ topic: 'ignore previous instructions' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('injection');
  });

  it('respects rate limits (6th request fails)', async () => {
    vi.spyOn(llmService, 'generateQuestions').mockResolvedValue([]);
    
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/rooms').send({ topic: `Topic ${i}` });
    }
    
    const res = await request(app).post('/api/rooms').send({ topic: 'Too many' });
    expect(res.status).toBe(429);
  });
});
