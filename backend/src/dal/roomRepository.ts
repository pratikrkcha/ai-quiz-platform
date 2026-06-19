import { RoomModel, IRoom, IQuestion } from '../models/Room';

export class RoomError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'RoomError';
  }
}

const MAX_PLAYERS = 100;

export const createRoom = async (roomCode: string, hostToken: string, questions: IQuestion[], timerDuration: number = 30) => {
  try {
    const room = new RoomModel({
      roomCode,
      hostToken,
      questions,
      timerDuration,
      status: 'lobby',
      currentQuestionIndex: -1,
      players: []
    });
    return await room.save();
  } catch (err: any) {
    if (err.code === 11000) {
      throw new RoomError('ROOM_CODE_COLLISION', 'Room code already exists');
    }
    throw err;
  }
};

export const findRoomByCode = async (roomCode: string) => {
  const room = await RoomModel.findOne({ roomCode });
  if (!room) throw new RoomError('ROOM_NOT_FOUND', `Room ${roomCode} not found`);
  return room;
};

export const generateUniqueRoomCode = async (): Promise<string> => {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const exists = await RoomModel.exists({ roomCode: code });
    if (!exists) return code;
  }
  throw new RoomError('ROOM_CODE_EXHAUSTION', 'Failed to generate a unique room code after 10 attempts');
};

export const addPlayer = async (roomCode: string, nickname: string, socketId: string) => {
  // Uses atomic updates: ensures room is in lobby, nickname is unique, and player limit is respected
  const room = await RoomModel.findOneAndUpdate(
    {
      roomCode,
      status: 'lobby',
      'players.nickname': { $ne: nickname },
      $expr: { $lt: [{ $size: '$players' }, MAX_PLAYERS] }
    },
    {
      $push: { players: { nickname, socketId, score: 0, hasAnsweredCurrent: false } }
    },
    { new: true }
  );

  if (!room) {
    const existing = await RoomModel.findOne({ roomCode });
    if (!existing) throw new RoomError('ROOM_NOT_FOUND', 'Room does not exist');
    if (existing.status !== 'lobby') throw new RoomError('ROOM_NOT_IN_LOBBY', 'Game has already started');
    if (existing.players.length >= MAX_PLAYERS) throw new RoomError('ROOM_FULL', 'Room is full');
    if (existing.players.some(p => p.nickname === nickname)) throw new RoomError('NICKNAME_TAKEN', 'Nickname already in use');
    throw new RoomError('JOIN_FAILED', 'Failed to join room');
  }
  return room;
};

export const removePlayer = async (roomCode: string, socketId: string) => {
  // We nullify the socketId instead of removing the player so they can reconnect and reclaim their score
  const room = await RoomModel.findOneAndUpdate(
    { roomCode, 'players.socketId': socketId },
    { $set: { 'players.$.socketId': null } },
    { new: true }
  );
  if (!room) throw new RoomError('PLAYER_NOT_FOUND', 'Player with socket not found');
  return room;
};

export const updateHostSocket = async (roomCode: string, socketId: string) => {
  const room = await RoomModel.findOneAndUpdate(
    { roomCode },
    { $set: { hostSocketId: socketId } },
    { new: true }
  );
  if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Room not found');
  return room;
};

export const reconnectPlayer = async (roomCode: string, nickname: string, newSocketId: string) => {
  // Finds a disconnected player (socketId: null) matching the nickname and assigns the new socketId
  const room = await RoomModel.findOneAndUpdate(
    { roomCode, 'players.nickname': nickname, 'players.socketId': null },
    { $set: { 'players.$.socketId': newSocketId } },
    { new: true }
  );
  if (!room) throw new RoomError('RECONNECT_FAILED', 'Could not reconnect player');
  return room;
};

export const advanceQuestion = async (roomCode: string) => {
  // Atomically increments question index and resets the hasAnsweredCurrent flag for all players
  const room = await RoomModel.findOneAndUpdate(
    { roomCode },
    {
      $inc: { currentQuestionIndex: 1 },
      $set: { 'players.$[].hasAnsweredCurrent': false }
    },
    { new: true }
  );
  if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Room not found');
  return room;
};

export const submitAnswer = async (roomCode: string, socketId: string, answerIndex: number) => {
  // First, fetch the question to determine if the answer is correct
  const roomDoc = await RoomModel.findOne({ roomCode, status: 'playing' });
  if (!roomDoc) throw new RoomError('ROOM_NOT_PLAYING', 'Room not found or not currently playing');

  const qIndex = roomDoc.currentQuestionIndex;
  const question = roomDoc.questions[qIndex];
  if (!question) throw new RoomError('INVALID_QUESTION', 'Question index is out of bounds');

  const isCorrect = question.correctIndex === answerIndex;
  const points = isCorrect ? 100 : 0;

  // Atomically update score and lock out future answers. 
  // Conditions: must be the same question index, player must have NOT answered yet.
  const updatedRoom = await RoomModel.findOneAndUpdate(
    {
      roomCode,
      currentQuestionIndex: qIndex,
      'players.socketId': socketId,
      'players.hasAnsweredCurrent': false
    },
    {
      $set: { 'players.$.hasAnsweredCurrent': true },
      $inc: { 'players.$.score': points }
    },
    { new: true }
  );

  if (!updatedRoom) {
    const existing = await RoomModel.findOne({ roomCode, 'players.socketId': socketId });
    if (!existing) throw new RoomError('PLAYER_NOT_FOUND', 'Player not found in room');
    const p = existing.players.find(p => p.socketId === socketId);
    if (p && p.hasAnsweredCurrent) throw new RoomError('ALREADY_ANSWERED', 'Player already answered this question');
    if (existing.currentQuestionIndex !== qIndex) throw new RoomError('QUESTION_ADVANCED', 'Question has already advanced');
    throw new RoomError('SUBMIT_FAILED', 'Failed to submit answer');
  }

  return { correct: isCorrect, points, correctIndex: question.correctIndex };
};

export const getLeaderboard = async (roomCode: string) => {
  const room = await findRoomByCode(roomCode);
  return room.players
    .map(p => ({ nickname: p.nickname, score: p.score }))
    .sort((a, b) => b.score - a.score);
};

export const setRoomStatus = async (roomCode: string, status: 'lobby' | 'playing' | 'finished') => {
  const room = await RoomModel.findOneAndUpdate(
    { roomCode },
    { $set: { status } },
    { new: true }
  );
  if (!room) throw new RoomError('ROOM_NOT_FOUND', 'Room not found');
  return room;
};
