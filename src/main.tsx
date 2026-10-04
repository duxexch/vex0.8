import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n';
import './index.css';

// ==============================================================================
// 🚀 HIGH-PERFORMANCE GLOBAL 3D POINTER INTERACTION ENGINE (SPOTLIGHT & TILT)
// ==============================================================================
if (typeof window !== 'undefined') {
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isTouch && !isReducedMotion) {
    let activeElement: HTMLElement | null = null;
    let rafId: number | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest('.spotlight-surface, .tilt-card-3d') as HTMLElement;
      
      // If we moved off the previous active element, reset it
      if (activeElement && activeElement !== target) {
        resetElement(activeElement);
        activeElement = null;
      }

      if (!target) return;
      activeElement = target;

      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        // Subtle professional 3D tilt angles (clamped to max 5.5 degrees)
        const maxTilt = 5.5;
        const tiltX = ((yPercent - 50) / 50) * -maxTilt;
        const tiltY = ((xPercent - 50) / 50) * maxTilt;

        target.style.setProperty('--spotlight-x', `${xPercent.toFixed(1)}%`);
        target.style.setProperty('--spotlight-y', `${yPercent.toFixed(1)}%`);
        target.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
        target.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
        target.style.setProperty('--spotlight-opacity', '1');
      });
    };

    const handlePointerLeave = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest('.spotlight-surface, .tilt-card-3d') as HTMLElement;
      if (target) {
        resetElement(target);
        if (activeElement === target) {
          activeElement = null;
        }
      }
    };

    const resetElement = (el: HTMLElement) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
        el.style.setProperty('--spotlight-opacity', '0');
      });
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerout', handlePointerLeave as any, { passive: true });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);

