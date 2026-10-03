import React from 'react';
import { motion } from 'motion/react';
import { Check, Sparkles } from 'lucide-react';

interface DetailItem {
  label: string;
  value: string;
  isMono?: boolean;
}

interface SuccessAnimationProps {
  title: string;
  subtitle?: React.ReactNode;
  badge?: string;
  amount?: string | number;
  details?: DetailItem[];
  onDone?: () => void;
  doneText?: string;
}

// Staggered particle burst angles
const PARTICLES = Array.from({ length: 16 }).map((_, i) => ({
  angle: (360 / 16) * i,
  distance: 60 + Math.random() * 40,
  size: 4 + Math.random() * 4,
  color: ['#10b981', '#059669', '#34d399', '#fbbf24', '#f59e0b', '#38bdf8'][Math.floor(Math.random() * 6)],
  delay: 0.1 + Math.random() * 0.2,
  rotation: Math.random() * 360,
}));

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  title,
  subtitle,
  badge,
  amount,
  details,
  onDone,
  doneText = 'تم بنجاح',
}) => {
  return (
    <div className="py-6 px-2 flex flex-col items-center text-center select-none relative overflow-hidden">
      {/* Icon with Expanding Ripple & Radial Burst */}
      <div className="relative w-32 h-32 flex items-center justify-center mb-6">
        {/* Expanding Echo Rings */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0.8 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full bg-emerald-500/20 pointer-events-none"
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.5, delay: 0.3, repeat: Infinity, repeatDelay: 0.5, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full bg-emerald-400/20 pointer-events-none"
        />

        {/* Floating Radiating Particle Dots (Confetti) */}
        {PARTICLES.map((p, idx) => {
          const rad = (p.angle * Math.PI) / 180;
          const targetX = Math.cos(rad) * p.distance;
          const targetY = Math.sin(rad) * p.distance;

          return (
            <motion.div
              key={idx}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
              animate={{
                x: targetX,
                y: targetY + (Math.random() * 20), // slight gravity
                scale: [0, 1.5, 1],
                opacity: [0, 1, 0],
                rotate: p.rotation + 180,
              }}
              transition={{
                duration: 1.2,
                delay: p.delay,
                ease: [0.175, 0.885, 0.32, 1.275], // spring-like easing
              }}
              style={{
                width: p.size * 2,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: '2px',
              }}
              className="absolute pointer-events-none shadow-xs"
            />
          );
        })}

        {/* Central Animated Badge Container */}
        <motion.div
          initial={{ scale: 0, rotate: -45, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 15,
            delay: 0.1,
          }}
          className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center"
        >
          {/* SVG Animated Circle & Checkmark */}
          <svg className="w-16 h-16" viewBox="0 0 52 52">
            {/* Background circle outline */}
            <motion.circle
              cx="26"
              cy="26"
              r="22"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeOpacity="0.4"
            />
            {/* Drawing Foreground Circle */}
            <motion.circle
              cx="26"
              cy="26"
              r="22"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0, rotate: -90 }}
              animate={{ pathLength: 1, rotate: -90 }}
              transition={{
                duration: 0.55,
                ease: 'easeInOut',
                delay: 0.1,
              }}
              style={{ transformOrigin: 'center' }}
            />
            {/* Animated Drawing Checkmark */}
            <motion.path
              d="M15 27 L23 35 L37 19"
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 0.45,
                ease: 'easeOut',
                delay: 0.35,
              }}
            />
          </svg>
        </motion.div>
      </div>

      {/* Badge Pill */}
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mb-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{badge}</span>
        </motion.div>
      )}

      {/* Title */}
      <motion.h4
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45 }}
        className="text-lg font-black text-slate-900 dark:text-white tracking-tight"
      >
        {title}
      </motion.h4>

      {/* Amount Display (if present) */}
      {amount !== undefined && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.42, duration: 0.4 }}
          className="mt-2 inline-block px-4 py-1.5 rounded-2xl bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80"
        >
          <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
            ${amount}
          </span>
        </motion.div>
      )}

      {/* Subtitle / Description */}
      {subtitle && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.45 }}
          className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed mt-2"
        >
          {subtitle}
        </motion.div>
      )}

      {/* Details Box */}
      {details && details.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45 }}
          className="w-full mt-4 p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 text-xs"
        >
          {details.map((d, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">{d.label}</span>
              <span
                className={`text-slate-800 dark:text-slate-200 font-extrabold ${
                  d.isMono ? 'font-mono' : ''
                }`}
              >
                {d.value}
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Action / Done Button */}
      {onDone && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.62, duration: 0.45 }}
          className="w-full mt-5"
        >
          <button
            type="button"
            onClick={onDone}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs shadow-sm transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{doneText}</span>
          </button>
        </motion.div>
      )}
    </div>
  );
};
