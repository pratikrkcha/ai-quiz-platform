import { io, Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Singleton socket instance. Not exported by default to force usage through useSocket hook.
export const socket: Socket = io(URL, {
  autoConnect: false, // Explicitly connect only when a roomCode is established
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});
