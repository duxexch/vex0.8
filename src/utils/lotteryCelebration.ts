import confetti from 'canvas-confetti';

/**
 * Trigger an opulent golden confetti blast with stars & golden flakes
 */
export function triggerGoldenConfettiBurst() {
  if (typeof window === 'undefined') return;

  // Custom golden palette
  const colors = ['#f59e0b', '#fbbf24', '#eab308', '#10b981', '#ffffff', '#ffd700'];

  // Left cannon
  confetti({
    particleCount: 50,
    angle: 60,
    spread: 70,
    origin: { x: 0.1, y: 0.7 },
    colors,
    shapes: ['star', 'circle'],
    scalar: 1.2,
    zIndex: 9999,
  });

  // Right cannon
  confetti({
    particleCount: 50,
    angle: 120,
    spread: 70,
    origin: { x: 0.9, y: 0.7 },
    colors,
    shapes: ['star', 'circle'],
    scalar: 1.2,
    zIndex: 9999,
  });

  // Center golden star fountain
  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 100,
      origin: { x: 0.5, y: 0.4 },
      colors: ['#ffd700', '#f59e0b', '#34d399'],
      shapes: ['star'],
      scalar: 1.4,
      ticks: 200,
      gravity: 0.9,
      zIndex: 9999,
    });
  }, 200);
}

/**
 * Trigger a grand Jackpot Celebration firework effect
 */
export function triggerJackpotCelebration() {
  if (typeof window === 'undefined') return;

  const duration = 2.5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 70, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval: any = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    // Since particles fall down, start a bit higher than random
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#ffd700', '#f59e0b', '#10b981', '#38bdf8'],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#ffd700', '#fbbf24', '#ec4899', '#6366f1'],
    });
  }, 250);
}

/**
 * Trigger tailored prize tier celebration
 */
export function triggerPrizeWonCelebration(amount: number = 0, isJackpot: boolean = false) {
  if (isJackpot || amount >= 1000) {
    triggerJackpotCelebration();
  } else {
    triggerGoldenConfettiBurst();
  }
}
