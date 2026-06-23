import { Socket, Server } from 'socket.io';
import { z } from 'zod';
import { addPlayer, reconnectPlayer, submitAnswer, findRoomByCode, getLeaderboard, RoomError } from '../../dal/roomRepository';

const PlayerJoinSchema = z.object({
  roomCode: z.string().length(4),
  // Security & Validation: 
  // Added .trim() to ensure users cannot submit whitespace-only names to bypass .min(1)
  nickname: z.string().trim().min(1, 'Nickname cannot be empty').max(20).regex(/^[a-zA-Z0-9 ]+$/, 'Alphanumeric and spaces only')
});

const badWords = ['fuck', 'shit', 'bitch']; 

export const handlePlayerJoin = async (io: Server, socket: Socket, payload: any) => {
  const { roomCode, nickname } = PlayerJoinSchema.parse(payload);
  
  if (badWords.some(w => nickname.toLowerCase().includes(w))) {
    throw new Error('Profanity detected in nickname');
  }

  // Idempotent join: attempt reconnection first, fall back to new registration
  try {
    await reconnectPlayer(roomCode, nickname, socket.id);
  } catch (e) {
    await addPlayer(roomCode, nickname, socket.id);
  }

  socket.join(roomCode);
  socket.data.roomCode = roomCode;
  socket.data.nickname = nickname;
  socket.data.isHost = false;

  const room = await findRoomByCode(roomCode);
  const player = room.players.find(p => p.socketId === socket.id);

  socket.emit('join_success', { 
    nickname, 
    currentScore: player?.score || 0,
    questionCount: room.questions.length
  });

  io.to(roomCode).emit('player_joined', { 
    players: room.players.map(p => ({ nickname: p.nickname, score: p.score })) 
  });
};

const SubmitAnswerSchema = z.object({
  answerIndex: z.number().int().min(0).max(3)
});

export const handlePlayerSubmitAnswer = async (io: Server, socket: Socket, payload: any) => {
  const roomCode = socket.data.roomCode;
  // Security check: must have joined a room, and a Host cannot submit answers
  if (!roomCode || socket.data.isHost) throw new Error('Unauthorized action');

  const { answerIndex } = SubmitAnswerSchema.parse(payload);

  try {
    const result = await submitAnswer(roomCode, socket.id, answerIndex);
    
    // correctIndex is ONLY emitted securely back to the specific client that answered
    socket.emit('answer_result', {
      correct: result.correct,
      points: result.points,
      correctIndex: result.correctIndex 
    });

    // Broadcast generic leaderboard silently to update UI without spoiling the answer
    const leaderboard = await getLeaderboard(roomCode);
    io.to(roomCode).emit('leaderboard_update', { leaderboard });

    if (result.allAnswered) {
      const { triggerQuestionCloseEarly } = await import('../state/timerManager');
      await triggerQuestionCloseEarly(io, roomCode, result.correctIndex);
    }

  } catch (err: any) {
    if (err instanceof RoomError && err.code === 'ALREADY_ANSWERED') {
      socket.emit('error', { message: 'Answer already submitted' });
    } else {
      throw err;
    }
  }
};
