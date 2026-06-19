import { useState, useEffect } from 'react';

export const AILoadingScreen = () => {
  const [textIndex, setTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const lines = [
    "Reading your topic...",
    "Thinking of tricky questions...",
    "Checking the answers...",
    "Almost ready..."
  ];

  useEffect(() => {
    let currentLine = lines[textIndex % lines.length];
    let charIndex = 0;
    
    // Type out the word
    const typeInterval = setInterval(() => {
      if (charIndex <= currentLine.length) {
        setDisplayedText(currentLine.substring(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        
        // Wait 1.5 seconds, then clear and go to next line
        setTimeout(() => {
          setDisplayedText('');
          setIsTyping(true);
          setTextIndex(prev => prev + 1);
        }, 1500);
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, [textIndex]);

  return (
    <>
      <style>
        {`
          @keyframes aiPulse {
            0% { transform: scale(0.95); box-shadow: 0 0 20px rgba(124, 58, 237, 0.2); }
            50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(124, 58, 237, 0.6); }
            100% { transform: scale(0.95); box-shadow: 0 0 20px rgba(124, 58, 237, 0.2); }
          }
          
          @keyframes orbit1 {
            0% { transform: rotate(0deg) translateX(50px) rotate(0deg); }
            100% { transform: rotate(360deg) translateX(50px) rotate(-360deg); }
          }
          
          @keyframes orbit2 {
            0% { transform: rotate(120deg) translateX(70px) rotate(-120deg); }
            100% { transform: rotate(480deg) translateX(70px) rotate(-480deg); }
          }

          @keyframes orbit3 {
            0% { transform: rotate(240deg) translateX(60px) rotate(-240deg); }
            100% { transform: rotate(600deg) translateX(60px) rotate(-600deg); }
          }

          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          
          @keyframes rotateStar {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .ai-gradient-bg {
            background: linear-gradient(135deg, #4285F4, #7C3AED, #06B6D4);
          }
          
          .shimmer-strip {
            background: linear-gradient(90deg, #4285F4, #7C3AED, #06B6D4, #4285F4);
            background-size: 200% 100%;
            animation: shimmer 1.5s linear infinite;
          }
          
          /* For mobile responsiveness */
          @media (max-width: 640px) {
            .orb-core { width: 80px !important; height: 80px !important; }
            @keyframes orbit1 { 0% { transform: rotate(0deg) translateX(40px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(40px) rotate(-360deg); } }
            @keyframes orbit2 { 0% { transform: rotate(120deg) translateX(50px) rotate(-120deg); } 100% { transform: rotate(480deg) translateX(50px) rotate(-480deg); } }
            @keyframes orbit3 { 0% { transform: rotate(240deg) translateX(45px) rotate(-240deg); } 100% { transform: rotate(600deg) translateX(45px) rotate(-600deg); } }
          }
        `}
      </style>
      
      <div className="bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden" style={{ minHeight: '450px', width: '100%' }}>
        {/* Soft dark overlay behind the card logic (if meant to be part of the card background) */}
        <div className="absolute inset-0 z-0 bg-[rgba(0,0,0,0.02)]"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full p-8">
          
          {/* Animated Orb Container */}
          <div className="relative flex items-center justify-center mb-12 h-32 w-32">
            {/* Core Orb */}
            <div 
              className="orb-core ai-gradient-bg rounded-full w-24 h-24 absolute"
              style={{ animation: 'aiPulse 2s ease-in-out infinite' }}
            ></div>
            
            {/* Orbiting Dots */}
            <div 
              className="w-3 h-3 rounded-full ai-gradient-bg absolute shadow-sm"
              style={{ animation: 'orbit1 3s linear infinite' }}
            ></div>
            <div 
              className="w-2.5 h-2.5 rounded-full ai-gradient-bg absolute shadow-sm"
              style={{ animation: 'orbit2 4s linear infinite', opacity: 0.8 }}
            ></div>
            <div 
              className="w-2 h-2 rounded-full ai-gradient-bg absolute shadow-sm"
              style={{ animation: 'orbit3 2.5s linear infinite', opacity: 0.9 }}
            ></div>
          </div>
          
          {/* Typewriter Text */}
          <div className="h-8 mb-4">
            <h3 className="font-patrick text-2xl text-[#2d2d2d] text-center m-0">
              {displayedText}
              <span className={`inline-block w-[2px] h-5 ml-1 bg-[#2d2d2d] align-middle ${isTyping ? '' : 'animate-pulse'}`}></span>
            </h3>
          </div>
          
          {/* Shimmer Strip */}
          <div className="shimmer-strip w-[200px] h-[3px] rounded-full mx-auto mb-10"></div>
          
          {/* Powered by Gemini Label */}
          <div className="absolute bottom-6 flex items-center justify-center text-[#4285F4] font-patrick text-sm font-bold opacity-80">
            <span className="inline-block mr-1.5" style={{ animation: 'rotateStar 3s linear infinite' }}>✦</span>
            Powered by Gemini
          </div>
          
        </div>
      </div>
    </>
  );
};
