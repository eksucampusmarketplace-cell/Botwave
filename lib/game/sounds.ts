// Sound effects system for chess.com-level audio feedback
// Uses Web Audio API for low-latency sound generation

type SoundType =
  | 'move'
  | 'capture'
  | 'check'
  | 'castle'
  | 'promote'
  | 'gameStart'
  | 'gameEnd'
  | 'lowTime'
  | 'draw'
  | 'illegal'
  | 'premove'
  | 'notify'
  | 'tenSeconds';

let audioContext: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioContext;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3,
  attack: number = 0.01,
  decay: number = 0.1
) {
  const ctx = getAudioContext();
  if (!ctx || !soundEnabled) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Envelope
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration - decay);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume: number = 0.1) {
  const ctx = getAudioContext();
  if (!ctx || !soundEnabled) return;

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * volume;
  }

  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, ctx.currentTime);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  source.start();
}

const SOUND_CONFIGS: Record<SoundType, () => void> = {
  move: () => {
    // Warm click — like a piece on wood
    playTone(800, 0.08, 'sine', 0.25, 0.005, 0.02);
    playNoise(0.04, 0.08);
  },
  capture: () => {
    // Aggressive thud
    playTone(300, 0.15, 'sine', 0.4, 0.005, 0.05);
    playTone(150, 0.12, 'triangle', 0.2, 0.01, 0.04);
    playNoise(0.08, 0.15);
  },
  check: () => {
    // Sharp alert tone
    playTone(880, 0.08, 'square', 0.15, 0.005, 0.02);
    setTimeout(() => playTone(1100, 0.12, 'square', 0.12, 0.005, 0.03), 80);
  },
  castle: () => {
    // Double piece move
    playTone(600, 0.06, 'sine', 0.2, 0.005, 0.02);
    playNoise(0.03, 0.06);
    setTimeout(() => {
      playTone(700, 0.06, 'sine', 0.2, 0.005, 0.02);
      playNoise(0.03, 0.06);
    }, 100);
  },
  promote: () => {
    // Rising triumphant tone
    playTone(523, 0.1, 'sine', 0.2, 0.01, 0.03);
    setTimeout(() => playTone(659, 0.1, 'sine', 0.2, 0.01, 0.03), 100);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.25, 0.01, 0.05), 200);
  },
  gameStart: () => {
    // Upbeat start chime
    playTone(440, 0.1, 'sine', 0.15, 0.01, 0.03);
    setTimeout(() => playTone(554, 0.1, 'sine', 0.15, 0.01, 0.03), 120);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.2, 0.01, 0.05), 240);
  },
  gameEnd: () => {
    // Final chord
    playTone(523, 0.4, 'sine', 0.15, 0.02, 0.1);
    playTone(659, 0.4, 'sine', 0.12, 0.02, 0.1);
    playTone(784, 0.4, 'sine', 0.12, 0.02, 0.1);
  },
  lowTime: () => {
    // Tick-tock warning
    playTone(1000, 0.05, 'square', 0.1, 0.005, 0.01);
  },
  draw: () => {
    // Neutral resolution
    playTone(440, 0.2, 'sine', 0.15, 0.02, 0.06);
    setTimeout(() => playTone(440, 0.3, 'sine', 0.1, 0.02, 0.1), 250);
  },
  illegal: () => {
    // Error buzz
    playTone(200, 0.15, 'sawtooth', 0.1, 0.005, 0.04);
  },
  premove: () => {
    // Soft confirmation
    playTone(600, 0.05, 'sine', 0.1, 0.005, 0.01);
  },
  notify: () => {
    // Notification ping
    playTone(880, 0.1, 'sine', 0.2, 0.005, 0.03);
    setTimeout(() => playTone(1100, 0.15, 'sine', 0.15, 0.005, 0.05), 120);
  },
  tenSeconds: () => {
    // Urgent ticking
    playTone(1200, 0.03, 'square', 0.15, 0.005, 0.01);
  },
};

export function playSound(type: SoundType): void {
  if (!soundEnabled) return;
  try {
    SOUND_CONFIGS[type]();
  } catch {
    // Silently fail
  }
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

// Determine which sound to play based on move SAN
export function getSoundForMove(san: string, isGameOver: boolean): SoundType {
  if (isGameOver) return 'gameEnd';
  if (san.includes('#')) return 'gameEnd'; // checkmate
  if (san.includes('+')) return 'check';
  if (san.includes('x')) return 'capture';
  if (san === 'O-O' || san === 'O-O-O') return 'castle';
  if (san.includes('=')) return 'promote';
  return 'move';
}

// Resume audio context (needed after user interaction on some browsers)
export function resumeAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}
