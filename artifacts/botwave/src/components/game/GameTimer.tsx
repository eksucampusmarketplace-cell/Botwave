

import React from 'react';

interface GameTimerProps {
  timeWhite: number;
  timeBlack: number;
  activeColor: 'w' | 'b';
  isPlaying: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function GameTimer({ timeWhite, timeBlack, activeColor, isPlaying }: GameTimerProps) {
  const isLowWhite = timeWhite <= 30 && isPlaying;
  const isLowBlack = timeBlack <= 30 && isPlaying;

  return (
    <div className="flex justify-between items-center gap-4">
      <div
        className={`flex-1 text-center py-3 rounded-xl font-mono text-2xl font-bold transition-colors ${
          activeColor === 'w' && isPlaying
            ? isLowWhite
              ? 'bg-red-600/30 text-red-300 animate-pulse border-2 border-red-500'
              : 'bg-white/10 text-white border-2 border-white/30'
            : 'bg-gray-800/50 text-gray-400 border-2 border-gray-700'
        }`}
      >
        {formatTime(timeWhite)}
      </div>
      <div
        className={`flex-1 text-center py-3 rounded-xl font-mono text-2xl font-bold transition-colors ${
          activeColor === 'b' && isPlaying
            ? isLowBlack
              ? 'bg-red-600/30 text-red-300 animate-pulse border-2 border-red-500'
              : 'bg-gray-700/50 text-gray-200 border-2 border-gray-500'
            : 'bg-gray-800/50 text-gray-400 border-2 border-gray-700'
        }`}
      >
        {formatTime(timeBlack)}
      </div>
    </div>
  );
}
