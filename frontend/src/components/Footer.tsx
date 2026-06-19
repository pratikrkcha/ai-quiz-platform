export const Footer = () => {
  return (
    <footer className="w-full border-t border-dashed border-ink/30 bg-[rgba(45,45,45,0.04)] py-3 mt-auto">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 font-patrick text-[13px] text-ink/60">
        <span>Built by Pratik Rakhecha</span>
        <svg width="10" height="10" viewBox="0 0 28 28" fill="none" className="hidden sm:block opacity-60">
          <path d="M14 0C14 0 14 14 0 14C0 14 14 14 14 28C14 28 14 14 28 14C28 14 14 14 14 0Z" fill="url(#footerGeminiGrad)"/>
          <defs>
            <linearGradient id="footerGeminiGrad" x1="0" y1="0" x2="28" y2="28">
              <stop offset="0%" stop-color="#4285F4"/>
              <stop offset="50%" stop-color="#7C3AED"/>
              <stop offset="100%" stop-color="#06B6D4"/>
            </linearGradient>
          </defs>
        </svg>
        <a 
          href="https://github.com/pratikrkcha" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-bluepen hover:underline transition-colors"
        >
          github.com/pratikrkcha
        </a>
      </div>
    </footer>
  );
};
