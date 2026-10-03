/**
 * Native Haptic Feedback Utility for VEX Deals
 * Provides subtle tactile feedback on mobile devices supporting the Vibration API.
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'): void {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(12);
        break;
      case 'medium':
        navigator.vibrate(25);
        break;
      case 'heavy':
        navigator.vibrate(45);
        break;
      case 'success':
        navigator.vibrate([15, 40, 20]);
        break;
      case 'warning':
        navigator.vibrate([30, 50, 30]);
        break;
      case 'error':
        navigator.vibrate([50, 60, 50]);
        break;
      default:
        navigator.vibrate(15);
    }
  } catch {
    // Graceful fallback on devices with vibration permissions blocked
  }
}
