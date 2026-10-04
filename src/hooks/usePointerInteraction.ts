import { useEffect, useRef } from 'react';

interface PointerInteractionOptions {
  tiltMaxAngle?: number;
  spotlight?: boolean;
  magnetic?: boolean;
  magneticStrength?: number;
  disabled?: boolean;
}

/**
 * High-performance 3D Pointer Interaction Hook
 * Directly updates CSS custom variables (--pointer-x, --pointer-y, --tilt-x, --tilt-y, --spotlight-x, --spotlight-y)
 * via requestAnimationFrame without triggering React component re-renders.
 */
export function usePointerInteraction<T extends HTMLElement = HTMLDivElement>(
  options: PointerInteractionOptions = {}
) {
  const {
    tiltMaxAngle = 6,
    spotlight = true,
    magnetic = false,
    magneticStrength = 0.2,
    disabled = false,
  } = options;

  const elementRef = useRef<T | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || disabled) return;

    // Check if user prefers reduced motion or is on coarse touch input
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isTouch || isReducedMotion) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        // Calculate 3D tilt angles clamped safely
        const tiltX = ((yPercent - 50) / 50) * -tiltMaxAngle;
        const tiltY = ((xPercent - 50) / 50) * tiltMaxAngle;

        el.style.setProperty('--spotlight-x', `${xPercent.toFixed(1)}%`);
        el.style.setProperty('--spotlight-y', `${yPercent.toFixed(1)}%`);
        el.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
        el.style.setProperty('--spotlight-opacity', '1');

        if (magnetic) {
          const magX = (x - rect.width / 2) * magneticStrength;
          const magY = (y - rect.height / 2) * magneticStrength;
          el.style.setProperty('--magnetic-x', `${magX.toFixed(1)}px`);
          el.style.setProperty('--magnetic-y', `${magY.toFixed(1)}px`);
        }
      });
    };

    const handlePointerLeave = () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

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
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [tiltMaxAngle, spotlight, magnetic, magneticStrength, disabled]);

  return elementRef;
}
