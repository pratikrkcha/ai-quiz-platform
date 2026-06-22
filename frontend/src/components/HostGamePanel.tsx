import { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useSocket } from '../hooks/useSocket';

export const HostGamePanel = () => {
  const { currentQuestion, leaderboard, status, questionCount, correctAnswerIndex } = useGameStore();
  const { emit } = useSocket();
  const [isNexting, setIsNexting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Derive if question is closed from Zustand state
  const isQuestionClosed = correctAnswerIndex !== null;

  useEffect(() => {
    if (!currentQuestion) {
      setTimeLeft(0);
      return;
    }

    if (isQuestionClosed) {
      setTimeLeft(currentQuestion.timeLimitMs / 1000);
      return;
    }

    setTimeLeft(currentQuestion.timeLimitMs / 1000);

    // Rough client-side timer for host visual (server strictly enforces the real timer)
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion, isQuestionClosed]);

  const handleNextQuestion = () => {
    if (isNexting) return;
    setIsNexting(true);
    emit('host_next_question');
    setTimeout(() => setIsNexting(false), 500); // UI Debounce protection
  };

  // Sort leaderboard descending for display
  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.score - a.score);

  if (status === 'finished') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-paper font-patrick text-ink">
        <h1 className="text-7xl font-kalam font-bold text-accent mb-8 -rotate-2 drop-shadow-md">Game Over!</h1>
        <div className="max-w-2xl w-full bg-white border-[3px] border-ink p-8 rounded-wobbly shadow-[8px_8px_0px_0px_#2d2d2d]">
          <h2 className="text-4xl font-bold mb-6 text-center border-b-2 border-dashed border-ink pb-4">Final Leaderboard</h2>
          <div className="space-y-4">
            {sortedLeaderboard.map((player, idx) => (
              <div key={idx} className="flex justify-between items-center text-2xl p-4 bg-muted border-2 border-ink rounded-wobblyMd hover:-rotate-1 transition-transform">
                <span className="font-bold flex items-center gap-3">
                  <span className="bg-white w-8 h-8 rounded-full border-2 border-ink flex justify-center items-center text-lg">{idx + 1}</span>
                  {player.nickname}
                </span>
                <span className="font-kalam text-3xl font-bold text-accent">{player.score} pts</span>
              </div>
            ))}
            {sortedLeaderboard.length === 0 && <p className="text-center text-2xl text-ink/60 my-8 italic">No players scored.</p>}
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-8 w-full bg-[#fff9c4] border-[3px] border-ink py-4 text-3xl font-kalam font-bold rounded-wobbly shadow-[4px_4px_0px_0px_#2d2d2d] hover:bg-accent hover:text-white transition-colors"
          >
            Create New Quiz
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row p-4 lg:p-8 gap-8 bg-paper font-patrick text-ink">
      
      {/* Left Column: Question Area */}
      <div className="flex-1 flex flex-col max-w-4xl">
        <div className="bg-white border-[3px] border-ink p-6 md:p-10 rounded-wobbly shadow-[8px_8px_0px_0px_#2d2d2d] flex-1 flex flex-col relative">
          {/* Tape decor */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-6 bg-gray-300/40 rotate-1 backdrop-blur-sm"></div>

          <div className="flex justify-between items-center mb-8 border-b-2 border-dashed border-ink pb-4">
            <h2 className="text-2xl md:text-3xl font-kalam font-bold text-bluepen">
              Question {currentQuestion.index + 1} <span className="text-ink/50">of {questionCount}</span>
            </h2>
            {!isQuestionClosed ? (
              <div className="text-3xl font-kalam font-bold flex items-center bg-accent text-white px-6 py-2 rounded-wobbly border-[3px] border-ink rotate-2 shadow-[2px_2px_0px_0px_#2d2d2d]">
                ⏱ {timeLeft}s
              </div>
            ) : (
              <div className="text-3xl font-kalam font-bold text-accent -rotate-2 animate-pulse">
                Time's Up!
              </div>
            )}
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold mb-12 flex-1 leading-tight">
            {currentQuestion.text}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentQuestion.options.map((opt, idx) => {
              const isCorrect = isQuestionClosed && correctAnswerIndex === idx;
              const isWrong = isQuestionClosed && correctAnswerIndex !== null && correctAnswerIndex !== idx;
              
              let bgClass = "bg-white";
              if (isCorrect) bgClass = "bg-[#4ade80] text-ink"; // Green
              if (isWrong) bgClass = "bg-muted opacity-60";

              return (
                <div 
                  key={idx}
                  className={`${bgClass} border-[3px] border-ink p-4 rounded-wobblyMd text-2xl font-bold transition-all flex items-center shadow-[4px_4px_0px_0px_#2d2d2d]`}
                >
                  <span className="w-10 h-10 min-w-10 rounded-full border-[3px] border-ink flex items-center justify-center mr-4 bg-paper text-ink font-kalam text-xl">
                    {['A','B','C','D'][idx]}
                  </span>
                  <span>{opt}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex justify-end">
            <button 
              onClick={handleNextQuestion}
              disabled={isNexting || !isQuestionClosed}
              className="bg-[#fff9c4] text-ink border-[3px] border-ink py-4 px-10 text-3xl font-kalam font-bold rounded-wobbly shadow-[6px_6px_0px_0px_#2d2d2d] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#2d2d2d] active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all hover:bg-accent hover:text-white"
            >
              {isNexting ? 'Loading...' : 'Next Question ➔'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Leaderboard Sidebar */}
      <div className="w-full lg:w-96 bg-[#fff9c4] border-[3px] border-ink p-6 rounded-wobblyMd shadow-[6px_6px_0px_0px_#2d2d2d] relative h-fit lg:sticky lg:top-8">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-bluepen rounded-full shadow-md z-20 border-2 border-ink"></div>
        
        <h3 className="text-4xl font-kalam font-bold text-center mb-6 mt-2">Live Rankings</h3>
        
        <div className="space-y-4">
          {sortedLeaderboard.map((player, idx) => (
            <div 
              key={player.nickname} 
              className="flex justify-between items-center bg-white border-2 border-ink p-3 rounded-wobbly text-2xl shadow-[3px_3px_0px_0px_#2d2d2d] transition-all duration-300 hover:rotate-1"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <span className="font-bold opacity-40 text-lg w-6">{idx + 1}.</span>
                <span className="truncate max-w-[140px] font-bold">{player.nickname}</span>
              </div>
              <span className="font-kalam text-3xl font-bold text-accent">{player.score}</span>
            </div>
          ))}
          {sortedLeaderboard.length === 0 && (
            <div className="text-center p-6 border-2 border-dashed border-ink/40 rounded-wobbly text-ink/60 text-xl">
              Waiting for scores...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
