import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useGameStore } from '../store/useGameStore';
import { useSocket } from '../hooks/useSocket';
import { HostGamePanel } from '../components/HostGamePanel';
import { Copy, Users } from 'lucide-react';

export const HostView = () => {
  const { isHost, hostToken, roomCode, status, leaderboard, socketConnected } = useGameStore();
  const { emit, connect } = useSocket();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // Security check: ensure valid host state exists
    if (!isHost || !hostToken || !roomCode) {
      setLocation('/');
      return;
    }
    connect();
  }, [isHost, hostToken, roomCode, setLocation, connect]);

  const handleCopy = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = () => {
    if (isStarting || !socketConnected) return; // Prevent double trigger
    setIsStarting(true);
    emit('host_start_game');
    setTimeout(() => setIsStarting(false), 1000); // Safety unlock
  };

  if (status === 'playing' || status === 'finished') {
    return <HostGamePanel />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-paper font-patrick text-ink">
      <div className="max-w-2xl w-full bg-white border-[3px] border-ink p-8 md:p-16 rounded-wobbly shadow-[8px_8px_0px_0px_#2d2d2d] relative hover:rotate-1 transition-transform duration-300">
        {/* Tape decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-8 bg-[#e5e0d8] opacity-80 rotate-2 border border-ink/20 shadow-sm"></div>

        <h1 className="text-5xl md:text-6xl font-kalam font-bold text-center mb-8">Room Created!</h1>
        
        <div className="bg-[#fff9c4] border-[3px] border-ink p-8 rounded-wobblyMd -rotate-1 mb-10 text-center flex flex-col items-center shadow-inner relative">
          <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-accent border-2 border-ink shadow-md"></div>
          
          <p className="text-3xl font-bold mb-4 font-kalam text-bluepen">Join Code:</p>
          <div className="flex items-center space-x-6 bg-white border-[3px] border-ink py-4 px-8 rounded-wobbly shadow-[inset_3px_3px_0px_0px_rgba(0,0,0,0.1)]">
            <span className="text-6xl font-bold font-kalam tracking-[0.2em]">{roomCode}</span>
            <button 
              onClick={handleCopy}
              className="p-3 hover:bg-muted border-2 border-transparent hover:border-ink rounded-wobbly transition-all active:scale-95"
              aria-label="Copy room code"
            >
              <Copy size={36} className={copied ? "text-bluepen" : "text-ink"} />
            </button>
          </div>
          {copied && <p className="text-bluepen mt-4 text-xl font-bold font-kalam animate-pulse">Copied to clipboard!</p>}
        </div>

        <div className="flex items-center justify-between mb-12 text-3xl border-t-[3px] border-dashed border-ink/30 pt-8 px-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 border-2 border-ink rounded-full bg-muted rotate-6">
              <Users size={32} />
            </div>
            <span className="font-bold font-kalam">
              {leaderboard.length} Player{leaderboard.length !== 1 ? 's' : ''} Joined
            </span>
          </div>
          {!socketConnected && <span className="text-accent animate-pulse font-bold text-2xl">Connecting...</span>}
        </div>

        <button 
          onClick={handleStartGame}
          disabled={!socketConnected || isStarting}
          className="w-full bg-accent text-white border-[3px] border-ink py-5 text-4xl font-kalam font-bold rounded-wobbly shadow-[6px_6px_0px_0px_#2d2d2d] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#2d2d2d] active:translate-y-2 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isStarting ? 'Starting Game...' : 'Start Quiz Now!'}
        </button>
        
        {leaderboard.length === 0 && socketConnected && (
          <p className="text-center mt-6 text-ink/60 text-lg">
            (You can start without players to test the quiz)
          </p>
        )}
      </div>
    </div>
  );
};
