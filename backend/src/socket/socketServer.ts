import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { removePlayer } from '../dal/roomRepository';
import { handleHostJoin, handleStartGame, handleNextQuestion } from './handlers/hostHandlers';
import { handlePlayerJoin, handlePlayerSubmitAnswer } from './handlers/playerHandlers';
import { clearQuestionTimer } from './state/timerManager';

// Security: Socket Event Rate Limiting Maps
const submitAnswerRates = new Map<string, number[]>();
const joinRoomRates = new Map<string, number[]>();

const checkRateLimit = (socketId: string, map: Map<string, number[]>, limit: number, windowMs: number): boolean => {
  const now = Date.now();
  let timestamps = map.get(socketId) || [];
  timestamps = timestamps.filter(t => now - t < windowMs);
  
  if (timestamps.length >= limit) {
    return false;
  }
  
  timestamps.push(now);
  map.set(socketId, timestamps);
  return true;
};

export const setupSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true }
  });

  // Security: Event Wrapper handling Rate Limiting and Centralized Error Trapping
  const wrap = (socket: Socket, handler: Function, rateLimitConfig?: { map: Map<string, number[]>, limit: number, windowMs: number }) => {
    return async (payload?: any) => {
      try {
        if (rateLimitConfig) {
          const allowed = checkRateLimit(socket.id, rateLimitConfig.map, rateLimitConfig.limit, rateLimitConfig.windowMs);
          if (!allowed) {
            throw new Error('Rate limit exceeded for this event');
          }
        }
        await handler(io, socket, payload);
      } catch (err: any) {
        console.error(`[Socket Error - ${socket.id} - ${socket.data?.uuid}]`, err.message);
        socket.emit('error', { message: err.message });
      }
    };
  };

  io.on('connection', (socket) => {
    // Security: Assign UUID for isolated traceability
    socket.data = socket.data || {};
    socket.data.uuid = uuidv4();
    console.log(`[Connected] ${socket.id} (UUID: ${socket.data.uuid})`);

    // Host handlers are not aggressively rate limited as only the host acts
    socket.on('host_join', wrap(socket, handleHostJoin));
    socket.on('host_start_game', wrap(socket, handleStartGame));
    socket.on('host_next_question', wrap(socket, handleNextQuestion));

    // Player events are fiercely rate limited to prevent DoS via flood
    socket.on('player_join', wrap(socket, handlePlayerJoin, { map: joinRoomRates, limit: 10, windowMs: 60000 }));
    socket.on('player_submit_answer', wrap(socket, handlePlayerSubmitAnswer, { map: submitAnswerRates, limit: 5, windowMs: 1000 }));

    socket.on('disconnect', async () => {
      // Clean up rate limiting maps to prevent memory leaks
      submitAnswerRates.delete(socket.id);
      joinRoomRates.delete(socket.id);

      const roomCode = socket.data?.roomCode;
      if (!roomCode) return;

      if (socket.data?.isHost) {
        clearQuestionTimer(roomCode);
        io.to(roomCode).emit('host_disconnected');
        console.log(`[Host Dropped] Room: ${roomCode} UUID: ${socket.data?.uuid}`);
      } else {
        try {
          await removePlayer(roomCode, socket.id);
          io.to(roomCode).emit('player_disconnected', { socketId: socket.id });
        } catch (e) {}
      }
    });
  });

  return io;
};
