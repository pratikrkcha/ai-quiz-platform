import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useGameStore } from '../store/useGameStore';
import { useSocket } from '../hooks/useSocket';
import { Loader2 } from 'lucide-react';

export const JoinPage = () => {
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [, setLocation] = useLocation();
  const { emit, subscribe, connect } = useSocket();
  const setPlayerRole = useGameStore(state => state.setPlayerRole);
  
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length !== 4 || !nickname.trim()) return;

    setIsLoading(true);
    setError('');
    connect();

    // Set up listeners for the response
    const unsubSuccess = subscribe('join_success', (data) => {
      cleanup();
      setPlayerRole(roomCode.toUpperCase(), data.nickname, data.currentScore);
      setLocation(`/play/${roomCode.toUpperCase()}`);
    });

    const unsubError = subscribe('error', (data) => {
      cleanup();
      setError(data.message);
      setIsLoading(false);
    });

    const cleanup = () => {
      unsubSuccess();
      unsubError();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    // Emit the join event
    emit('player_join', { roomCode: roomCode.toUpperCase(), nickname: nickname.trim() });
    
    // Safety timeout in case the server is offline or unreachable
    timeoutRef.current = setTimeout(() => {
      cleanup();
      setError('Connection timed out. The game server might be sleeping.');
      setIsLoading(false);
    }, 10000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-paper font-patrick text-ink">
      <div className="max-w-md w-full bg-white border-[3px] border-ink p-8 md:p-10 rounded-wobbly shadow-[8px_8px_0px_0px_#2d2d2d] relative hover:-rotate-1 transition-transform duration-300">
        {/* Tape decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-8 bg-[#ff4d4d]/20 rotate-3 backdrop-blur-sm border-2 border-ink/10"></div>

        <h1 className="text-5xl font-kalam font-bold text-center mb-8 text-bluepen">Join Quiz!</h1>
        
        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label htmlFor="roomCode" className="block text-2xl font-bold mb-2">Room Code</label>
            <input 
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').substring(0, 4))}
              placeholder="e.g. 1234"
              autoFocus
              className="w-full bg-paper border-[3px] border-ink p-4 rounded-wobbly focus:outline-none focus:border-bluepen focus:ring-2 focus:ring-bluepen/20 text-4xl font-kalam text-center tracking-[0.2em] placeholder-ink/30 uppercase shadow-[inset_3px_3px_0px_0px_rgba(0,0,0,0.05)] transition-colors"
            />
          </div>

          <div>
            <label htmlFor="nickname" className="block text-2xl font-bold mb-2">Your Nickname</label>
            <input 
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              placeholder="e.g. QuizMaster99"
              className="w-full bg-paper border-[3px] border-ink p-4 rounded-wobblyMd focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-2xl shadow-[inset_3px_3px_0px_0px_rgba(0,0,0,0.05)] transition-colors"
            />
          </div>

          {error && (
            <div className="bg-[#ff4d4d]/10 p-3 rounded-wobblyMd border-2 border-accent border-dashed text-accent font-bold text-xl text-center transform -rotate-1">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={isLoading || roomCode.length !== 4 || !nickname.trim()}
            className="w-full bg-muted border-[3px] border-ink py-4 text-3xl font-bold font-kalam rounded-wobbly shadow-[6px_6px_0px_0px_#2d2d2d] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#2d2d2d] active:translate-y-2 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center hover:bg-bluepen hover:text-white mt-4"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'Enter Room'}
          </button>
        </form>
      </div>
    </div>
  );
};
