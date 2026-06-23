import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGameStore } from '../store/useGameStore';
import './AIButtonLoader.css';

export const LandingPage = () => {
  const [topic, setTopic] = useState('');
  const [timerDuration, setTimerDuration] = useState<number>(30);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [typewriterText, setTypewriterText] = useState('');
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  
  const [, setLocation] = useLocation();
  const setHostRole = useGameStore(state => state.setHostRole);

  useEffect(() => {
    if (!isLoading) {
      setTypewriterText('');
      setTypewriterIndex(0);
      return;
    }

    const lines = [
      "Reading your topic...",
      "Crafting questions...",
      "Almost ready..."
    ];
    
    const currentLineIdx = typewriterIndex % lines.length;
    const currentLine = lines[currentLineIdx];
    let charIdx = 0;
    let isMounted = true;
    
    const typeInterval = setInterval(() => {
      if (!isMounted) return;
      if (charIdx <= currentLine.length) {
        setTypewriterText(currentLine.substring(0, charIdx));
        charIdx++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          if (!isMounted) return;
          setTypewriterText('');
          setTypewriterIndex(prev => prev + 1);
        }, 1500);
      }
    }, 50);

    return () => {
      isMounted = false;
      clearInterval(typeInterval);
    };
  }, [isLoading, typewriterIndex]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || topic.length > 200) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const endpoint = `${baseUrl}/api/rooms`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), timerDuration, numQuestions })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to create room');
      
      setHostRole(data.roomCode, data.hostToken, numQuestions);
      setLocation(`/host/${data.roomCode}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Network error. Please try again.';
      setError(errorMessage || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col items-center justify-center p-6 font-patrick text-ink"
    >
      {/* Hand drawn decor */}
      <div className="relative mb-12 -rotate-2 z-50 inline-block text-center mt-6">
        <svg 
          width="32" height="32" viewBox="0 0 28 28" fill="none" 
          className="absolute -top-5 -left-10 hidden md:block drop-shadow-[0_0_12px_rgba(124,58,237,0.6)]"
        >
          <path d="M14 0C14 0 14 14 0 14C0 14 14 14 14 28C14 28 14 14 28 14C28 14 14 14 14 0Z" fill="url(#geminiGradSm)"/>
          <defs>
            <linearGradient id="geminiGradSm" x1="0" y1="0" x2="28" y2="28">
              <stop offset="0%" stop-color="#4285F4"/>
              <stop offset="50%" stop-color="#7C3AED"/>
              <stop offset="100%" stop-color="#06B6D4"/>
            </linearGradient>
          </defs>
        </svg>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-kalam font-bold text-accent whitespace-normal md:whitespace-nowrap leading-tight text-center">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4285F4] via-[#7C3AED] to-[#06B6D4] drop-shadow-sm pr-2 sm:pr-3">
            AI
          </span>
          Quiz Builder!
          <svg 
            width="48" height="48" viewBox="0 0 28 28" fill="none" 
            className="inline-block align-top -mt-3 ml-1 drop-shadow-[0_0_12px_rgba(124,58,237,0.6)]"
          >
            <path d="M14 0C14 0 14 14 0 14C0 14 14 14 14 28C14 28 14 14 28 14C28 14 14 14 14 0Z" fill="url(#geminiGrad)"/>
            <defs>
              <linearGradient id="geminiGrad" x1="0" y1="0" x2="28" y2="28">
                <stop offset="0%" stop-color="#4285F4"/>
                <stop offset="50%" stop-color="#7C3AED"/>
                <stop offset="100%" stop-color="#06B6D4"/>
              </linearGradient>
            </defs>
          </svg>
        </h1>
      </div>
      
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {/* Host Card */}
        <div className="bg-white border-[3px] border-ink p-8 rounded-wobbly shadow-[6px_6px_0px_0px_#2d2d2d] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#2d2d2d] transition-all duration-200">
          <h2 className="text-3xl font-kalam mb-4 font-bold border-b-2 border-dashed border-ink pb-2">Host a Quiz</h2>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div>
                <label htmlFor="topic" className="block text-xl font-bold mb-2">What's the topic?</label>
                <textarea 
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. The history of Rome..."
                  aria-label="Quiz topic"
                  className="w-full bg-paper border-2 border-ink p-4 rounded-wobblyMd focus:outline-none focus:border-bluepen focus:ring-2 focus:ring-bluepen/20 resize-none h-28 text-xl placeholder-ink/40"
                />
                <div className="text-right text-sm text-ink/70 mt-1 font-bold">
                  {topic.length}/100
                </div>
              </div>
              
              <div className="pt-2">
                <label className="block text-xl font-bold mb-2">Timer Duration</label>
                <div className="flex gap-2 justify-between">
                  {[15, 30, 50, 120].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimerDuration(t)}
                      className={`flex-1 py-2 font-kalam font-bold text-lg rounded-wobbly transition-all ${
                        timerDuration === t 
                          ? 'bg-[#fff9c4] border-[3px] border-ink shadow-[2px_2px_0px_0px_#2d2d2d]' 
                          : 'bg-white border-2 border-ink hover:bg-gray-50'
                      }`}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xl font-bold mb-2">Number of Questions</label>
                <div className="flex gap-2 justify-between">
                  {[5, 10, 15].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setNumQuestions(q)}
                      className={`flex-1 py-2 font-kalam font-bold text-lg rounded-wobbly transition-all ${
                        numQuestions === q 
                          ? 'bg-[#fff9c4] border-[3px] border-ink shadow-[2px_2px_0px_0px_#2d2d2d]' 
                          : 'bg-white border-2 border-ink hover:bg-gray-50'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-accent font-bold text-lg">{error}</p>}
              
              <div className="relative mt-4">
                <div className="sparkle-container">
                  <div className={`sparkle sparkle-1 ${isLoading ? 'show' : ''}`}>
                    <svg className="sparkle-inner" viewBox="0 0 28 28" fill="none">
                      <path d="M14 0C14 0 14 14 0 14C0 14 14 14 14 28C14 28 14 14 28 14C28 14 14 14 14 0Z" fill="#4285F4"/>
                    </svg>
                  </div>
                  <div className={`sparkle sparkle-2 ${isLoading ? 'show' : ''}`}>
                    <svg className="sparkle-inner" viewBox="0 0 28 28" fill="none">
                      <path d="M14 0C14 0 14 14 0 14C0 14 14 14 14 28C14 28 14 14 28 14C28 14 14 14 14 0Z" fill="#7C3AED"/>
                    </svg>
                  </div>
                  <div className={`sparkle sparkle-3 ${isLoading ? 'show' : ''}`}>
                    <svg className="sparkle-inner" viewBox="0 0 28 28" fill="none">
                      <path d="M14 0C14 0 14 14 0 14C0 14 14 14 14 28C14 28 14 14 28 14C28 14 14 14 14 0Z" fill="#06B6D4"/>
                    </svg>
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  disabled={isLoading || !topic.trim()}
                  className={`w-full border-[3px] border-ink py-3 text-2xl font-bold rounded-wobbly shadow-[4px_4px_0px_0px_#2d2d2d] transition-all flex items-center justify-center group ${
                    isLoading ? 'gemini-btn-loading' : 'bg-[#fff9c4] hover:bg-accent hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <span className={isLoading ? '' : 'group-hover:-rotate-2 transition-transform'}>
                    {isLoading ? 'Generating...' : 'Generate Quiz'}
                  </span>
                </button>
              </div>

              <div className="text-center min-h-[50px] pt-2" style={{ visibility: isLoading ? 'visible' : 'hidden' }}>
                <div className="font-patrick text-[18px] text-[#4285F4]">
                  {typewriterText}
                </div>
                <div className="font-patrick text-[16px] text-[#4285F4] flex items-center justify-center mt-1">
                  <svg width="16" height="16" viewBox="0 0 28 28" fill="none" className="mr-1">
                    <path d="M14 0C14 0 14 14 0 14C0 14 14 14 14 28C14 28 14 14 28 14C28 14 14 14 14 0Z" fill="#4285F4"/>
                  </svg>
                  Powered by Gemini
                </div>
              </div>
            </form>
          </div>

        {/* Join Card */}
        <div className="bg-white border-[3px] border-ink p-8 rounded-wobblyMd shadow-[6px_6px_0px_0px_#2d2d2d] hover:rotate-1 hover:shadow-[8px_8px_0px_0px_#2d2d2d] transition-all duration-200 flex flex-col justify-center items-center text-center relative h-full">
          <div className="absolute -top-4 -right-4 w-8 h-8 bg-accent rounded-full shadow-md z-20 border-2 border-ink"></div> {/* Thumbtack */}
          <h2 className="text-3xl font-kalam mb-4 font-bold">Have a Code?</h2>
          <p className="text-xl mb-8">Join your friends and prove your knowledge on the live leaderboard!</p>
          <button 
            onClick={() => setLocation('/join')}
            className="w-full bg-muted border-[3px] border-ink py-3 text-2xl font-bold rounded-wobbly shadow-[4px_4px_0px_0px_#2d2d2d] hover:bg-bluepen hover:text-white transition-all hover:scale-[1.02]"
          >
            Join a Quiz
          </button>
        </div>
      </div>
    </div>
  );
};
