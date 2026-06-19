import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGameStore } from '../store/useGameStore';
import { useSocket } from '../hooks/useSocket';

export const PlayerView = () => {
  const { 
    nickname, roomCode, status, currentQuestion, questionCount,
    hasAnsweredCurrent, answerResult, correctAnswerIndex,
    score, leaderboard, socketConnected, submitAnswerSuccess
  } = useGameStore();
  const { emit, subscribe } = useSocket();
  const [, setLocation] = useLocation();
  
  // Local state for optimistic UI locking
  const [localSelection, setLocalSelection] = useState<number | null>(null);
  const [displayScore, setDisplayScore] = useState(score);
  const [timeLeft, setTimeLeft] = useState(0);

  // Auth Guard
  useEffect(() => {
    if (!nickname || !roomCode) {
      setLocation('/join');
    }
  }, [nickname, roomCode, setLocation]);

  // Handle answer result bridging from socket listener 
  // (Provides the user with point calculation from the server)
  useEffect(() => {
    const unsub = subscribe('answer_result', (data) => {
      submitAnswerSuccess(data);
    });
    return () => unsub();
  }, [subscribe, submitAnswerSuccess]);

  // Clear local selection cleanly when a new question starts
  useEffect(() => {
    setLocalSelection(null);
  }, [currentQuestion?.index]);

  // Warn user before navigating away (accidental back button click)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleAnswerSubmit = (index: number) => {
    if (localSelection !== null || correctAnswerIndex !== null || hasAnsweredCurrent) return;
    
    setLocalSelection(index); // Instantly optimistically lock the UI
    emit('player_submit_answer', { answerIndex: index });
  };

  const isQuestionClosed = correctAnswerIndex !== null;

  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.score - a.score);
  const myRank = sortedLeaderboard.findIndex(p => p.nickname === nickname) + 1;

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

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion, isQuestionClosed]);

  // Sync displayScore when not waiting for reveal
  useEffect(() => {
    if (!hasAnsweredCurrent) {
      setDisplayScore(score);
    }
  }, [score, hasAnsweredCurrent]);

  // Delayed update after reveal
  useEffect(() => {
    if (isQuestionClosed && hasAnsweredCurrent) {
      const timer = setTimeout(() => {
        setDisplayScore(score);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isQuestionClosed, hasAnsweredCurrent, score]);

  // Render State 1: Lobby
  if (status === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-paper font-patrick text-ink">
        <div className="max-w-md w-full bg-white border-[3px] border-ink p-8 rounded-wobbly shadow-[6px_6px_0px_0px_#2d2d2d] text-center relative hover:rotate-1 transition-transform">
          <div className="absolute -top-4 right-8 w-8 h-8 bg-bluepen rounded-full shadow-md z-20 border-2 border-ink"></div>
          
          <h2 className="text-4xl font-bold mb-4 font-kalam">Welcome, <span className="text-bluepen">{nickname}</span>!</h2>
          <p className="text-2xl mb-10">Room Code: <span className="font-bold font-kalam bg-[#fff9c4] px-4 py-2 text-3xl rounded-wobblyMd border-[3px] border-ink ml-2 inline-block -rotate-2">{roomCode}</span></p>
          
          <div className="bg-muted border-[3px] border-ink p-8 rounded-wobblyMd animate-pulse shadow-inner">
            <h3 className="text-3xl font-kalam font-bold text-ink">Waiting for Host...</h3>
            <p className="text-xl mt-2 text-ink/70">Get ready to prove your knowledge!</p>
          </div>
          
          <div className="mt-8 pt-6 border-t-[3px] border-dashed border-ink/30 text-2xl font-bold">
            Total Players Joined: <span className="text-accent">{leaderboard.length}</span>
          </div>
        </div>
      </div>
    );
  }

  // Render State 2: Finished
  if (status === 'finished') {
    const isTop3 = myRank > 0 && myRank <= 3;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-paper font-patrick text-ink overflow-hidden relative">
        {isTop3 && (
          <div className="absolute inset-0 pointer-events-none z-0">
            {[...Array(30)].map((_, i) => (
              <div 
                key={i} 
                className="absolute w-4 h-4 opacity-80"
                style={{
                  backgroundColor: ['#ff4d4d', '#2d5da1', '#4ade80', '#fff9c4'][i % 4],
                  left: `${Math.random() * 100}%`,
                  top: `-10%`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                  animation: `fall ${Math.random() * 3 + 2}s linear infinite`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
            <style>{`
              @keyframes fall {
                0% { transform: translateY(-10vh) rotate(0deg); }
                100% { transform: translateY(110vh) rotate(720deg); }
              }
            `}</style>
          </div>
        )}
        <h1 className="text-6xl md:text-7xl font-kalam font-bold text-accent mb-8 -rotate-2 relative z-10">Quiz Over!</h1>
        <div className="max-w-lg w-full bg-white border-[3px] border-ink p-8 md:p-12 rounded-wobbly shadow-[8px_8px_0px_0px_#2d2d2d] text-center relative hover:rotate-1 transition-transform z-10">
          {myRank === 1 && <div className="absolute -top-10 -right-4 text-7xl rotate-12 drop-shadow-lg animate-bounce">👑</div>}
          
          <h2 className="text-4xl font-bold mb-2">Final Score: <span className="font-kalam text-5xl text-accent block mt-2">{score} pts</span></h2>
          <p className="text-2xl mb-8 border-b-[3px] border-dashed border-ink pb-8 mt-6">
            You placed <span className="font-bold text-4xl text-bluepen bg-[#fff9c4] px-4 py-2 border-2 border-ink shadow-[2px_2px_0px_0px_#2d2d2d] rounded-wobblyMd inline-block mx-2 rotate-2">#{myRank || '-'}</span> out of {leaderboard.length}
          </p>

          <h3 className="text-3xl font-kalam font-bold mb-6">Final Leaderboard</h3>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2 pb-4">
            {sortedLeaderboard.map((p, idx) => (
              <div key={idx} className={`flex justify-between items-center p-4 border-[3px] border-ink rounded-wobblyMd text-2xl ${p.nickname === nickname ? 'bg-[#fff9c4] shadow-[4px_4px_0px_0px_#2d2d2d] font-bold scale-[1.02] -rotate-1' : 'bg-muted'}`}>
                <span className="flex items-center gap-3">
                  <span className="opacity-50 text-xl w-6">{idx + 1}.</span> 
                  <span className="truncate max-w-[150px]">{p.nickname}</span>
                </span>
                <span className="font-kalam text-accent">{p.score}</span>
              </div>
            ))}
          </div>

          <button onClick={() => setLocation('/join')} className="mt-8 w-full bg-[#fff9c4] border-[3px] border-ink py-4 text-3xl font-kalam font-bold rounded-wobbly shadow-[6px_6px_0px_0px_#2d2d2d] hover:bg-accent hover:text-white hover:-translate-y-1 transition-all active:translate-y-2 active:shadow-none">
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // Render State 3: Playing
  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-paper font-patrick text-ink">
      
      {/* Top Bar */}
      <div className="flex flex-row items-center justify-between mb-6 md:mb-10 bg-white border-[3px] border-ink p-4 md:p-6 rounded-wobbly shadow-[4px_4px_0px_0px_#2d2d2d]">
        
        {/* LEFT — nickname */}
        <div className="w-1/4 flex justify-start">
          <span className="font-bold text-2xl bg-[#fff9c4] px-4 py-1 border-2 border-ink rounded-wobblyMd hidden sm:inline -rotate-1 shadow-sm truncate max-w-full">
            {nickname}
          </span>
        </div>

        {/* CENTER — feedback appears here after answering */}
        <div className="w-2/4 flex justify-center items-center gap-3 text-3xl font-bold font-kalam text-center">
          {isQuestionClosed && answerResult ? (
            <div className="animate-bounce">
              <span className={answerResult.correct ? 'text-[#4ade80] drop-shadow-sm' : 'text-[#ff4d4d]'}>
                {answerResult.correct ? '🎉 Spot On! ' : '😬 Oops! '}
              </span>
              <span className="text-ink ml-2">
                {answerResult.correct ? `+${answerResult.points} pts` : '0 pts'}
              </span>
            </div>
          ) : (
            !socketConnected && <div className="text-accent font-bold animate-pulse text-xl">Reconnecting...</div>
          )}
        </div>

        {/* RIGHT — score, rank, question counter */}
        <div className="w-1/4 flex justify-end items-center gap-4 text-xl md:text-2xl font-bold">
          <div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-3 text-right">
            <span>Score: <span className="font-kalam text-accent">{displayScore}</span></span>
            {myRank > 0 && <span className="text-ink/60 hidden lg:inline">· Rank #{myRank}</span>}
          </div>
          <div className="font-kalam text-xl md:text-2xl text-[#2d5da1] bg-muted px-4 py-1 rounded-wobbly border-[3px] border-ink rotate-2 italic whitespace-nowrap">
            Q{currentQuestion.index + 1} of {questionCount || 5}
          </div>
        </div>
        
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto relative">
        <div className="flex flex-col md:flex-row gap-6 items-start w-full">
          
          {/* LEFT — existing question card */}
          <div className="flex-1 w-full">
            <div className="bg-white border-[3px] border-ink p-6 md:p-12 rounded-wobbly shadow-[8px_8px_0px_0px_#2d2d2d] flex flex-col relative z-10">
          
          {/* Progress Bar Timer */}
          {!isQuestionClosed && currentQuestion.timeLimitMs && (
            <div className="w-full mb-8 relative">
              <div className="w-full h-8 bg-muted border-[3px] border-ink rounded-wobbly overflow-hidden relative">
                <div 
                  className={`absolute top-0 left-0 h-full bg-[#ff4d4d] transition-all duration-1000 ease-linear border-r-[3px] border-ink ${timeLeft <= 5 ? 'animate-pulse' : ''}`}
                  style={{ width: `${(timeLeft / (currentQuestion.timeLimitMs / 1000)) * 100}%` }}
                ></div>
                <div className={`absolute inset-0 flex items-center justify-center font-kalam font-bold text-2xl drop-shadow-md z-10 ${timeLeft <= 5 ? 'text-white' : 'text-ink'}`}>
                  {timeLeft}s
                </div>
              </div>
            </div>
          )}

          <h1 className="text-3xl md:text-5xl font-bold mb-10 md:mb-14 flex-1 leading-snug">
            {currentQuestion.text}
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = localSelection === idx;
              
              let btnClass = "bg-white hover:bg-muted cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#2d2d2d]";
              let textColor = "text-ink";
              let shadow = "shadow-[4px_4px_0px_0px_#2d2d2d]";

              if (isQuestionClosed) {
                // Post-answer reveal
                if (correctAnswerIndex === idx) {
                  btnClass = "bg-[#4ade80] text-ink cursor-default scale-[1.02] border-[4px]"; // Green (Correct)
                  shadow = "shadow-none";
                } else if (isSelected) {
                  btnClass = "bg-[#ff4d4d] text-white cursor-default border-[4px]"; // Red (Wrong pick)
                  textColor = "text-white";
                  shadow = "shadow-none";
                } else {
                  btnClass = "bg-muted opacity-50 cursor-default"; // Unpicked wrong
                  shadow = "shadow-none";
                }
              } else if (localSelection !== null) {
                // Mid-answer lock (Waiting for server/timer)
                if (isSelected) {
                  btnClass = "bg-[#fff9c4] cursor-default border-[4px] bg-[radial-gradient(#e5e0d8_1px,transparent_1px)] [background-size:16px_16px]"; // Yellow selected with texture
                  shadow = "shadow-none translate-y-1";
                } else {
                  btnClass = "bg-gray-100 opacity-60 cursor-default"; // Disabled others
                  shadow = "shadow-none";
                }
              }

              return (
                <button 
                  key={idx}
                  disabled={localSelection !== null || isQuestionClosed}
                  onClick={() => handleAnswerSubmit(idx)}
                  className={`w-full text-left min-h-[5rem] border-[3px] border-ink p-4 md:p-6 rounded-wobblyMd text-2xl md:text-3xl font-bold transition-all flex items-center ${btnClass} ${shadow} ${textColor} touch-manipulation`}
                >
                  <span className={`w-12 h-12 min-w-[3rem] rounded-full border-[3px] border-ink flex items-center justify-center mr-4 md:mr-6 font-kalam text-2xl ${isQuestionClosed && correctAnswerIndex === idx ? 'bg-white text-ink' : 'bg-paper text-ink'}`}>
                    {['A','B','C','D'][idx]}
                  </span>
                  <span className="leading-tight">{opt}</span>
                </button>
              );
            })}
            </div>
          </div> 
        </div>

      {/* RIGHT — leaderboard card, always visible */}
      <div className="w-full md:w-80 shrink-0">
        <div className="bg-white border-[3px] border-ink p-6 rounded-wobblyMd shadow-[6px_6px_0px_0px_#2d2d2d] relative hover:rotate-1 transition-transform flex flex-col">
          {/* Thumbtack */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-bluepen rounded-full shadow-md z-20 border-2 border-ink"></div>

          <h4 className="text-2xl font-kalam font-bold text-center border-b-2 border-dashed border-ink pb-2 mb-3">Live Leaderboard</h4>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 flex-1">
            {sortedLeaderboard.map((p, idx) => (
              <div key={idx} className={`flex justify-between items-center p-3 border-2 border-ink rounded-wobbly ${p.nickname === nickname ? 'bg-[#fff9c4] shadow-[2px_2px_0px_0px_#2d2d2d] font-bold scale-[1.01] -rotate-1' : 'bg-muted/30 border-ink/40'}`}>
                <span className="flex items-center gap-2">
                  <span className="opacity-50 text-lg w-6">{idx + 1}.</span> 
                  <span className="truncate max-w-[120px]">{p.nickname}</span>
                </span>
                <span className="font-kalam text-2xl font-bold">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  </div>
    </div>
  );
};
