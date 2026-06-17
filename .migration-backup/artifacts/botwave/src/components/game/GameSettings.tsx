

import React from 'react';
import { BOARD_THEMES, TIME_CONTROLS } from '@/lib/game/types';
import { PIECE_STYLES, type PieceStyle } from '@/lib/game/pieces';

interface GameSettingsProps {
  theme: string;
  onThemeChange: (theme: string) => void;
  pieceStyle: PieceStyle;
  onPieceStyleChange: (style: PieceStyle) => void;
  timeControl: string;
  onTimeControlChange: (tc: string) => void;
  soundEnabled: boolean;
  onSoundChange: (enabled: boolean) => void;
  animationsEnabled: boolean;
  onAnimationsChange: (enabled: boolean) => void;
  premovesEnabled: boolean;
  onPremovesChange: (enabled: boolean) => void;
  showCoordinates: boolean;
  onCoordinatesChange: (show: boolean) => void;
  showLegalMoves: boolean;
  onLegalMovesChange: (show: boolean) => void;
  highlightStyle: 'dots' | 'squares';
  onHighlightStyleChange: (style: 'dots' | 'squares') => void;
  increment: number;
  onIncrementChange: (inc: number) => void;
  gameType?: string;
}

export default function GameSettings({
  theme,
  onThemeChange,
  pieceStyle,
  onPieceStyleChange,
  timeControl,
  onTimeControlChange,
  soundEnabled,
  onSoundChange,
  animationsEnabled,
  onAnimationsChange,
  premovesEnabled,
  onPremovesChange,
  showCoordinates,
  onCoordinatesChange,
  showLegalMoves,
  onLegalMovesChange,
  highlightStyle,
  onHighlightStyleChange,
  increment,
  onIncrementChange,
  gameType = 'chess',
}: GameSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Time Control */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Time Control</h4>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TIME_CONTROLS).map(([id, seconds]) => (
            <button
              key={id}
              onClick={() => onTimeControlChange(id)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                timeControl === id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <div className="font-medium">{id.charAt(0).toUpperCase() + id.slice(1)}</div>
              <div className="text-[10px] opacity-70">{Math.floor(seconds / 60)}m</div>
            </button>
          ))}
        </div>

        {/* Increment */}
        <div className="mt-3">
          <label className="text-xs text-gray-500 block mb-1">
            Increment (Fischer): +{increment}s per move
          </label>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 5, 10].map((inc) => (
              <button
                key={inc}
                onClick={() => onIncrementChange(inc)}
                className={`px-3 py-1 rounded text-xs ${
                  increment === inc
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                +{inc}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Board Theme */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Board Theme</h4>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {BOARD_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.id)}
              className={`rounded-lg overflow-hidden border-2 transition-colors ${
                theme === t.id ? 'border-purple-500' : 'border-transparent hover:border-gray-600'
              }`}
            >
              <div className="grid grid-cols-2 w-full aspect-square">
                <div style={{ backgroundColor: t.light }} />
                <div style={{ backgroundColor: t.dark }} />
                <div style={{ backgroundColor: t.dark }} />
                <div style={{ backgroundColor: t.light }} />
              </div>
              <div className="text-[10px] text-center py-1 bg-gray-900 text-gray-400">{t.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Piece Style (chess only) */}
      {gameType === 'chess' && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Piece Style</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {PIECE_STYLES.map((ps) => (
              <button
                key={ps.id}
                onClick={() => onPieceStyleChange(ps.id)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  pieceStyle === ps.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">{ps.name}</div>
                <div className="text-[10px] opacity-70">{ps.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toggles */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Preferences</h4>
        <div className="space-y-2">
          {[
            { label: 'Sound Effects', value: soundEnabled, onChange: onSoundChange, icon: '🔊' },
            { label: 'Move Animations', value: animationsEnabled, onChange: onAnimationsChange, icon: '✨' },
            { label: 'Premoves', value: premovesEnabled, onChange: onPremovesChange, icon: '⚡' },
            { label: 'Board Coordinates', value: showCoordinates, onChange: onCoordinatesChange, icon: '🔢' },
            { label: 'Legal Move Hints', value: showLegalMoves, onChange: onLegalMovesChange, icon: '🎯' },
          ].map((toggle) => (
            <div key={toggle.label} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-300">
                <span className="mr-2">{toggle.icon}</span>
                {toggle.label}
              </span>
              <button
                onClick={() => toggle.onChange(!toggle.value)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  toggle.value ? 'bg-purple-600' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                    toggle.value ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Highlight Style */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Move Highlight Style</h4>
        <div className="flex gap-2">
          {([
            { id: 'dots' as const, name: 'Dots', desc: 'Small dots on valid squares' },
            { id: 'squares' as const, name: 'Squares', desc: 'Highlighted square borders' },
          ]).map((hs) => (
            <button
              key={hs.id}
              onClick={() => onHighlightStyleChange(hs.id)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                highlightStyle === hs.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <div className="font-medium">{hs.name}</div>
              <div className="text-[10px] opacity-70">{hs.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
