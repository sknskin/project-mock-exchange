'use client';

import { useState, useEffect } from 'react';
import { ArrowUp, Settings } from 'lucide-react';

export default function FloatingActions() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-30 flex flex-col items-center gap-2.5">
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="w-11 h-11 rounded-full bg-bg-secondary/90 border border-border backdrop-blur-sm flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
          aria-label="맨 위로"
        >
          <ArrowUp className="w-[18px] h-[18px]" strokeWidth={2} />
        </button>
      )}
      <button
        className="w-11 h-11 rounded-full bg-bg-secondary/90 border border-border backdrop-blur-sm flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
        aria-label="설정"
      >
        <Settings className="w-[18px] h-[18px]" strokeWidth={1.8} />
      </button>
    </div>
  );
}
