import { Router } from 'express';
import { z } from 'zod';
import { generateQuestions } from '../services/llmService';
import { createRoom, generateUniqueRoomCode } from '../dal/roomRepository';
import { createRoomLimiter } from '../middlewares/rateLimiter';
import { v4 as uuidv4 } from 'uuid';

export const roomRouter = Router();

const createRoomSchema = z.object({
  topic: z.string().min(1).max(100),
  timerDuration: z.number().optional().default(30)
});

// Single REST endpoint for room creation, guarded by stricter rate limit
roomRouter.post('/', createRoomLimiter, async (req, res, next) => {
  try {
    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) {
       return res.status(400).json({ error: 'Invalid topic. Must be a string between 1 and 100 characters.' });
    }

    const { topic, timerDuration } = parsed.data;
    
    // Generates questions. If prompt injection occurs, this throws an error handled by errorMiddleware.
    // Otherwise, it returns 5 questions (or 5 fallback questions if Gemini API goes down entirely).
    const questions = await generateQuestions(topic);
    
    const roomCode = await generateUniqueRoomCode();
    const hostToken = uuidv4();
    
    await createRoom(roomCode, hostToken, questions, timerDuration);
    
    res.status(201).json({
      roomCode,
      hostToken,
      questionCount: questions.length
    });
  } catch (err) {
    next(err); // Centralized error handling
  }
});
