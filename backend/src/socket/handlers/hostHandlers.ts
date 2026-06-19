import { Socket, Server } from 'socket.io';
import { z } from 'zod';
import { findRoomByCode, updateHostSocket, setRoomStatus, advanceQuestion, getLeaderboard } from '../../dal/roomRepository';
import { startQuestionTimer, clearQuestionTimer } from '../state/timerManager';

const HostJoinSchema = z.object({
  roomCode: z.string().length(4),
  hostToken: z.string().uuid()
});

export const handleHostJoin = async (io: Server, socket: Socket, payload: any) => {
  const { roomCode, hostToken } = HostJoinSchema.parse(payload);
  
  const room = await findRoomByCode(roomCode);
  if (room.hostToken !== hostToken) {
    throw new Error('Unauthorized: Invalid host token');
  }

  await updateHostSocket(roomCode, socket.id);
  
  socket.join(roomCode);
  socket.data.roomCode = roomCode;
  socket.data.isHost = true;

  socket.emit('host_joined', { 
    roomCode, 
    questionCount: room.questions.length 
  });
};

export const handleStartGame = async (io: Server, socket: Socket) => {
  const roomCode = socket.data.roomCode;
  if (!roomCode || !socket.data.isHost) throw new Error('Unauthorized');

  const room = await findRoomByCode(roomCode);
  if (room.status !== 'lobby') throw new Error('Game already started');

  await setRoomStatus(roomCode, 'playing');
  const updatedRoom = await advanceQuestion(roomCode);
  
  const qIndex = updatedRoom.currentQuestionIndex;
  const question = updatedRoom.questions[qIndex];
  const timeLimitMs = (updatedRoom.timerDuration || 30) * 1000;

  io.to(roomCode).emit('question_started', {
    questionIndex: qIndex,
    text: question.text,
    options: question.options,
    timeLimitMs: timeLimitMs
  });

  startQuestionTimer(io, roomCode, timeLimitMs, question.correctIndex);
};

export const handleNextQuestion = async (io: Server, socket: Socket) => {
  const roomCode = socket.data.roomCode;
  if (!roomCode || !socket.data.isHost) throw new Error('Unauthorized');

  clearQuestionTimer(roomCode);

  const room = await findRoomByCode(roomCode);
  if (room.status !== 'playing') throw new Error('Game is not active');

  if (room.currentQuestionIndex + 1 >= room.questions.length) {
    await setRoomStatus(roomCode, 'finished');
    const leaderboard = await getLeaderboard(roomCode);
    io.to(roomCode).emit('game_over', { finalLeaderboard: leaderboard });
  } else {
    const updatedRoom = await advanceQuestion(roomCode);
    const qIndex = updatedRoom.currentQuestionIndex;
    const question = updatedRoom.questions[qIndex];
    const timeLimitMs = (updatedRoom.timerDuration || 30) * 1000;

    io.to(roomCode).emit('question_started', {
      questionIndex: qIndex,
      text: question.text,
      options: question.options,
      timeLimitMs: timeLimitMs
    });

    startQuestionTimer(io, roomCode, timeLimitMs, question.correctIndex);
  }
};
