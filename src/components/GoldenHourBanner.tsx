import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Timer } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

export const GoldenHourBanner: React.FC<{ lang: 'en' | 'ar' }> = ({ lang }) => {
  const [goldenHour, setGoldenHour] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    // Fetch initial state
    fetch('/api/viral/golden-hour')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.state && data.state.isActive) {
          const end = new Date(data.state.endTime).getTime();
          if (end > Date.now()) {
            setGoldenHour(data.state);
          }
        }
      })
      .catch(console.error);

    // Listen for socket event
    const socket = io();
    socket.on('golden_hour_started', (state: any) => {
      setGoldenHour(state);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!goldenHour) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(goldenHour.endTime).getTime();
      const distance = end - now;

      if (distance < 0) {
        setGoldenHour(null);
        clearInterval(interval);
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [goldenHour]);

  return (
    <AnimatePresence>
      {goldenHour && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 p-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg overflow-hidden border-b border-amber-300"
        >
          {/* Animated Background effect */}
          <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
          
          <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10 px-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full animate-bounce">
                <Zap className="w-5 h-5 text-yellow-100" />
              </div>
              <div>
                <h3 className="font-black text-sm md:text-base drop-shadow-md">
                  {lang === 'ar' ? goldenHour.messageAr : goldenHour.messageEn}
                </h3>
                <p className="text-xs md:text-sm font-bold opacity-90">
                  {lang === 'ar' ? 'قم بالإيداع الآن للاستفادة!' : 'Deposit now to claim!'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase opacity-80 mb-0.5">
                {lang === 'ar' ? 'ينتهي العرض خلال' : 'Ends In'}
              </span>
              <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg border border-white/20">
                <Timer className="w-4 h-4 text-amber-200" />
                <span className="font-black text-lg text-amber-100 tracking-wider font-mono">
                  {timeLeft}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
