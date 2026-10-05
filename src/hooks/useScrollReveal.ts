import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface ScrollRevealOptions {
  /** Intersection threshold (default 0.12). */
  threshold?: number;
  /** Root margin for early/late triggering (default: bottom -40px). */
  rootMargin?: string;
  /** Reveal only once (default true). */
  once?: boolean;
  /** Disable the effect entirely — element stays visible. */
  disabled?: boolean;
}

/**
 * Scroll Reveal (Phase 27/28/76)
 * Returns a callback ref, so it works even when the target element mounts
 * later (conditionally rendered content).
 *
 * Marks the element [data-reveal="pending"] before paint (no flash),
 * then flips to "in" when it enters the viewport via IntersectionObserver.
 * Reduced-motion users and disabled states render fully visible immediately.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
): (node: T | null) => void {
  const { threshold = 0.12, rootMargin = '0px 0px -40px 0px', once = true, disabled = false } = options;
  const [node, setNode] = useState<T | null>(null);
  const reducedMotion = useReducedMotion();
  const active = !disabled && !reducedMotion;

  const refCallback = useCallback((n: T | null) => setNode(n), []);

  // Pre-paint hide once the node exists (element without attribute = visible fallback)
  useLayoutEffect(() => {
    if (node && active) {
      node.setAttribute('data-reveal', 'pending');
    } else if (node) {
      node.setAttribute('data-reveal', 'in');
    }
  }, [node, active]);

  useEffect(() => {
    if (!node) return;
    if (!active) {
      node.setAttribute('data-reveal', 'in');
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      node.setAttribute('data-reveal', 'in');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.setAttribute('data-reveal', 'in');
            if (once) observer.disconnect();
          } else if (!once) {
            node.setAttribute('data-reveal', 'pending');
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, active, threshold, rootMargin, once]);

  return refCallback;
}
