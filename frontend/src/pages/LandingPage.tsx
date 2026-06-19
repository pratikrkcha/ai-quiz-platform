import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useGameStore } from '../store/useGameStore';
import { Loader2 } from 'lucide-react';

export const LandingPage = () => {
  const [topic, setTopic] = useState('');
  const [timerDuration, setTimerDuration] = useState<number>(30);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [, setLocation] = useLocation();
  const setHostRole = useGameStore(state => state.setHostRole);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || topic.length > 200) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), timerDuration, numQuestions })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create room');
      
      setHostRole(data.roomCode, data.hostToken, numQuestions);
      setLocation(`/host/${data.roomCode}`);
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-paper font-patrick text-ink">
      {/* Hand drawn decor */}
      <h1 className="text-6xl md:text-7xl font-kalam font-bold text-accent mb-12 -rotate-2">
        AI Quiz Builder!
      </h1>
      
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
                maxLength={200}
                placeholder="e.g. The history of Rome..."
                aria-label="Quiz topic"
                className="w-full bg-paper border-2 border-ink p-4 rounded-wobblyMd focus:outline-none focus:border-bluepen focus:ring-2 focus:ring-bluepen/20 resize-none h-28 text-xl placeholder-ink/40"
              />
              <div className="text-right text-sm text-ink/70 mt-1 font-bold">
                {topic.length}/200
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
            <button 
              type="submit" 
              disabled={isLoading || !topic.trim()}
              className="w-full bg-[#fff9c4] border-[3px] border-ink py-3 text-2xl font-bold rounded-wobbly shadow-[4px_4px_0px_0px_#2d2d2d] hover:bg-accent hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center group"
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : <span className="group-hover:-rotate-2 transition-transform">Generate Quiz</span>}
            </button>
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
