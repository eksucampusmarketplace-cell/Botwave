type HapticPattern = 'move' | 'capture' | 'check' | 'gameStart' | 'gameEnd' | 'error' | 'success' | 'tap';

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  move: 10,
  capture: [15, 30, 15],
  check: [20, 50, 20, 50, 20],
  gameStart: [30, 60, 30],
  gameEnd: [50, 100, 50, 100, 50],
  error: [100, 30, 100],
  success: [10, 30, 10, 30, 50],
  tap: 5,
};

export function supportsHaptics(): boolean {
  if (typeof window === 'undefined') return false;
  return 'vibrate' in navigator;
}

export function triggerHaptic(pattern: HapticPattern): void {
  if (!supportsHaptics()) return;
  const vibration = HAPTIC_PATTERNS[pattern];
  try {
    navigator.vibrate(vibration);
  } catch {
    // silently fail on unsupported devices
  }
}

export function getHapticForMove(san: string, isGameOver: boolean): HapticPattern {
  if (isGameOver) return 'gameEnd';
  if (san.includes('#')) return 'check';
  if (san.includes('+')) return 'check';
  if (san.includes('x')) return 'capture';
  return 'move';
}

export function cancelHaptic(): void {
  if (!supportsHaptics()) return;
  try {
    navigator.vibrate(0);
  } catch {
    // silently fail
  }
}
