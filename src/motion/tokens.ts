/**
 * Centralized Motion & Interaction Tokens (Phase 90/91)
 * Mirrors the CSS custom properties in src/index.css for JS-driven effects.
 * Keep magic numbers out of components — import from here.
 */

export type EasingTuple = [number, number, number, number];

/** Durations in seconds (motion/react convention). CSS mirrors in ms. */
export const MOTION = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
} as const;

export const EASE: Record<string, EasingTuple> = {
  standard: [0.16, 1, 0.3, 1],
  emphasized: [0.2, 0, 0, 1],
  decelerate: [0, 0, 0, 1],
  spring: [0.34, 1.56, 0.64, 1],
};

/** Hard safety clamps — pointer effects may never exceed these (Phase 91). */
export const LIMIT = {
  tiltMaxDeg: 6,
  cardTiltMaxDeg: 5,
  magneticMaxPx: 8,
  magneticMaxStrength: 0.18,
  parallaxMaxPx: 6,
  spotlightRadiusPx: 600,
} as const;

/** Presets for motion/react entrances (Phase 70 API). */
export const ENTER = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: MOTION.fast, ease: EASE.standard },
  },
  rise: {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: MOTION.normal, ease: EASE.standard },
  },
  pop: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.97 },
    transition: { duration: MOTION.normal, ease: EASE.standard },
  },
} as const;
