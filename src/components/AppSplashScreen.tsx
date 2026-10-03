import React, { useEffect, useState } from 'react';
import { AppBranding } from '../types';
import { AppIconRenderer } from './AppIconRenderer';
import { ShieldCheck } from 'lucide-react';

interface AppSplashScreenProps {
  branding: AppBranding;
  onFinish?: () => void;
  minDurationMs?: number;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  branding,
  onFinish,
  minDurationMs = 700,
}) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      const removeTimer = setTimeout(() => {
        setVisible(false);
        if (onFinish) onFinish();
      }, 300);
      return () => clearTimeout(removeTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onFinish]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white select-none transition-opacity duration-300 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex flex-col items-center gap-4 animate-fade-in text-center px-4">
        {/* Animated App Icon Container */}
        <div className="relative">
          <div className="absolute -inset-3 bg-gradient-to-tr from-emerald-500/30 to-amber-500/20 rounded-3xl blur-xl animate-pulse" />
          <div className="relative rounded-2xl p-1 bg-slate-800/80 border border-slate-700 shadow-2xl shadow-emerald-500/20">
            <AppIconRenderer branding={branding} size="lg" className="rounded-xl shadow-inner" />
          </div>
        </div>

        {/* Brand Name & Micro Tagline */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {branding?.appName || 'VEX Deals'}
          </h1>
          <p className="text-xs text-emerald-400 font-semibold tracking-wide">
            {branding?.tagline || 'منصة التعويضات وسحوبات اليانصيب التكافلي'}
          </p>
        </div>

        {/* Subtle Native App Progress Bar */}
        <div className="w-36 h-1 bg-slate-800 rounded-full overflow-hidden mt-2 relative">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full w-full animate-[smartPulseGlow_1.2s_ease-in-out_infinite]" />
        </div>

        {/* Security Trust Micro Label */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-6">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-mono">Provably Fair • SSL Secured</span>
        </div>
      </div>
    </div>
  );
};
