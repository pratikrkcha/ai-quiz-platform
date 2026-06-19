import { Server } from 'socket.io';
import { getLeaderboard } from '../../dal/roomRepository';

export const roomTimers = new Map<string, NodeJS.Timeout>();

export const startQuestionTimer = (
  io: Server, 
  roomCode: string, 
  durationMs: number, 
  correctIndex: number
) => {
  if (roomTimers.has(roomCode)) {
    clearTimeout(roomTimers.get(roomCode)!);
  }

  // Server-side timer enforcing the exact closure of the question
  const timer = setTimeout(async () => {
    roomTimers.delete(roomCode);
    try {
      const leaderboard = await getLeaderboard(roomCode);
      io.to(roomCode).emit('question_closed', { correctIndex, leaderboard });
    } catch (e) {
      console.error(`Failed to broadcast closed question for room ${roomCode}`, e);
    }
  }, durationMs);

  roomTimers.set(roomCode, timer);
};

export const clearQuestionTimer = (roomCode: string) => {
  if (roomTimers.has(roomCode)) {
    clearTimeout(roomTimers.get(roomCode)!);
    roomTimers.delete(roomCode);
  }
};
