import { useEffect, useCallback } from 'react';
import { socket } from '../socket/socketClient';
import { useGameStore } from '../store/useGameStore';

export const useSocket = () => {
  const { setConnectionStatus, roomCode, hostToken, nickname, isHost } = useGameStore();

  useEffect(() => {
    const onConnect = () => {
      setConnectionStatus(true, null);
      
      // AUTO-RECONNECT LOGIC: If socket drops and restores, re-register the session
      if (roomCode) {
        if (isHost && hostToken) {
          socket.emit('host_join', { roomCode, hostToken });
        } else if (!isHost && nickname) {
          socket.emit('player_join', { roomCode, nickname });
        }
      }
    };

    const onDisconnect = (reason: string) => {
      setConnectionStatus(false, null);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    };

    const onConnectError = (err: Error) => {
      setConnectionStatus(false, err.message);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // If socket is already connected when this hook mounts, fire onConnect immediately
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, [setConnectionStatus, roomCode, hostToken, nickname, isHost]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emit = useCallback((event: string, payload?: any) => {
    socket.emit(event, payload);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscribe = useCallback((event: string, callback: (...args: any[]) => void) => {
    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  }, []);

  // Connect manually
  const connect = useCallback(() => {
    if (!socket.connected) {
      socket.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    socket.disconnect();
  }, []);

  return { socket, emit, subscribe, connect, disconnect };
};
