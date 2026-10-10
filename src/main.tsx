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

// ==============================================================================
// 🔐 SESSION GUARD CLIENT (guest-first model)
// - attaches x-session-id (localStorage.vex_session_id) to same-origin calls
// - GET 401s are silent: guests keep browsing, callers fall back gracefully
// - mutation 401/403 SESSION_*: asks the app to open PhoneVerificationModal
//   (window event 'vex:require-link') — never navigates away
// - /api/admin* failures: bounce to /auth-required (unchanged)
// ==============================================================================
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch.bind(window);
  const AUTH_ERRORS = ['SESSION_REQUIRED', 'INVALID_SESSION', 'SESSION_EXPIRED', 'SESSION_NOT_VERIFIED'];
  const CLEARABLE_ERRORS = ['INVALID_SESSION', 'SESSION_EXPIRED'];

  const getRequestUrl = (input: RequestInfo | URL): string => {
    try {
      if (typeof input === 'string') return input;
      if (input instanceof URL) return input.href;
      return input.url;
    } catch {
      return '';
    }
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let finalInit: RequestInit | undefined = init;
    const requestUrl = getRequestUrl(input);

    // Attach the stored session number (survives nothing else after a cache clear — by design)
    try {
      const storedSessionId = localStorage.getItem('vex_session_id') || '';
      const isSameOrigin = requestUrl.startsWith('/') || requestUrl.startsWith(window.location.origin);
      if (storedSessionId && isSameOrigin) {
        const baseHeaders =
          init?.headers ??
          (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined);
        const headers = new Headers(baseHeaders || undefined);
        if (!headers.has('x-session-id')) {
          headers.set('x-session-id', storedSessionId);
          finalInit = { ...(init || {}), headers };
        }
      }
    } catch {
      // storage unavailable — cookie-only auth still works
    }

    const res = await originalFetch(input, finalInit);
    try {
      if (res.status === 401 || res.status === 403) {
        const data = await res.clone().json();
        if (data && typeof data.error === 'string' && AUTH_ERRORS.includes(data.error)) {
          if (CLEARABLE_ERRORS.includes(data.error)) {
            try {
              localStorage.removeItem('vex_session_id');
            } catch {
              // ignore
            }
          }
          const method = (
            finalInit?.method ||
            (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') ||
            'GET'
          ).toUpperCase();
          const isAdminCall = requestUrl.includes('/api/admin');
          const here = window.location.pathname;

          if (isAdminCall) {
            if (!here.startsWith('/auth-required')) {
              const redirect = here + window.location.search;
              window.location.assign('/auth-required?redirect=' + encodeURIComponent(redirect));
            }
          } else if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
            // Protected action without a verified session → in-app phone link modal
            window.dispatchEvent(
              new CustomEvent('vex:require-link', {
                detail: { error: data.error, message: data.message },
              })
            );
          }
          // GETs: silent — guest browsing continues
        }
      }
    } catch {
      // response is not JSON or already consumed — nothing to do
    }
    return res;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);

// Register the service worker early so the page meets PWA installability
// criteria (install prompt / "Add to Home Screen") even before push permission.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {});
  });
}

