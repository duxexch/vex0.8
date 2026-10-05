import { useEffect, useRef } from 'react';
import { LIMIT } from '../motion/tokens';
import { useReducedMotion, isCoarsePointer } from './useReducedMotion';

interface PointerInteractionOptions {
  /** Enable 3D tilt variable updates (default true). */
  tilt?: boolean;
  tiltMaxAngle?: number;
  spotlight?: boolean;
  magnetic?: boolean;
  magneticStrength?: number;
  disabled?: boolean;
}

/**
 * High-performance 3D Pointer Interaction Hook (Phase 44/46/71)
 * Updates CSS custom variables (--spotlight-x/y, --tilt-x/y, --magnetic-x/y)
 * inside requestAnimationFrame — never triggers React re-renders.
 *
 * Safety: magnetic movement is hard-clamped to LIMIT.magneticMaxPx,
 * tilt is bounded by tiltMaxAngle (≤ LIMIT.tiltMaxDeg recommended).
 * Disabled automatically on coarse pointers and prefers-reduced-motion.
 */
export function usePointerInteraction<T extends HTMLElement = HTMLDivElement>(
  options: PointerInteractionOptions = {}
) {
  const {
    tilt = true,
    tiltMaxAngle = LIMIT.tiltMaxDeg,
    spotlight = true,
    magnetic = false,
    magneticStrength = LIMIT.magneticMaxStrength,
    disabled = false,
  } = options;

  const elementRef = useRef<T | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = elementRef.current;
    if (!el || disabled || reducedMotion || isCoarsePointer()) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

      rafIdRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        if (spotlight) {
          el.style.setProperty('--spotlight-x', `${xPercent.toFixed(1)}%`);
          el.style.setProperty('--spotlight-y', `${yPercent.toFixed(1)}%`);
          el.style.setProperty('--spotlight-opacity', '1');
        }

        if (tilt) {
          const tiltX = ((yPercent - 50) / 50) * -tiltMaxAngle;
          const tiltY = ((xPercent - 50) / 50) * tiltMaxAngle;
          el.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
          el.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
        }

        if (magnetic) {
          const strength = Math.min(magneticStrength, LIMIT.magneticMaxStrength);
          const rawX = (x - rect.width / 2) * strength;
          const rawY = (y - rect.height / 2) * strength;
          const clamp = (v: number) =>
            Math.max(-LIMIT.magneticMaxPx, Math.min(LIMIT.magneticMaxPx, v)).toFixed(1);
          el.style.setProperty('--magnetic-x', `${clamp(rawX)}px`);
          el.style.setProperty('--magnetic-y', `${clamp(rawY)}px`);
        }
      });
    };

    const handlePointerLeave = () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

      rafIdRef.current = requestAnimationFrame(() => {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
        el.style.setProperty('--spotlight-opacity', '0');
        el.style.setProperty('--magnetic-x', '0px');
        el.style.setProperty('--magnetic-y', '0px');
      });
    };

    el.addEventListener('pointermove', handlePointerMove, { passive: true });
    el.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    return () => {
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerleave', handlePointerLeave);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [tilt, tiltMaxAngle, spotlight, magnetic, magneticStrength, disabled, reducedMotion]);

  return elementRef;
}
