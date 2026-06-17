

import React, { useState } from 'react';
import {
  GameRoom,
  GameSettings,
  BOARD_THEMES,
  PRESET_AVATARS,
  TIME_CONTROLS,
  ChessVariant,
} from '@/lib/game/types';
import { PIECE_STYLES, type PieceStyle } from '@/lib/game/pieces';

interface GameLobbyProps {
  room: GameRoom;
  myPlayerId: string;
  onReady: (ready: boolean) => void;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onNameChange: (name: string) => void;
  onAvatarChange: (avatar: string) => void;
}

export default function GameLobby({
  room,
  myPlayerId,
  onReady,
  onUpdateSettings,
  onNameChange,
  onAvatarChange,
}: GameLobbyProps) {
  const [showAvatars, setShowAvatars] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const myPlayer =
    room.player1?.id === myPlayerId ? room.player1 : room.player2;
  const opponent =
    room.player1?.id === myPlayerId ? room.player2 : room.player1;
  const isReady = myPlayer?.ready || false;

  const handleNameSubmit = () => {
    if (displayName.trim()) {
      onNameChange(displayName.trim());
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Room Info */}
      <div className="bg-gray-800/60 rounded-2xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white capitalize">
            {room.type === 'tictactoe' ? 'Tic-Tac-Toe' : room.type} Lobby
          </h2>
          <span className="text-sm text-gray-400 font-mono bg-gray-700/50 px-3 py-1 rounded-full">
            Room: {room.id}
          </span>
        </div>

        {/* Players */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Player 1 */}
          <div className={`rounded-xl p-4 border-2 transition-colors ${
            room.player1?.ready ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-700/30'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-2xl overflow-hidden">
                {room.player1 ? (
                  <span className="text-2xl">
                    {room.type === 'chess' ? '\u2654' : room.type === 'tictactoe' ? 'X' : '1'}
                  </span>
                ) : (
                  <span className="text-gray-400">?</span>
                )}
              </div>
              <div>
                <p className="text-white font-semibold">
                  {room.player1?.displayName || 'Waiting...'}
                </p>
                <p className="text-xs text-gray-400">
                  {room.player1?.ready ? '✓ Ready' : 'Not ready'}
                </p>
              </div>
            </div>
          </div>

          {/* Player 2 */}
          <div className={`rounded-xl p-4 border-2 transition-colors ${
            room.player2?.ready ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-700/30'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-2xl overflow-hidden">
                {room.player2 ? (
                  <span className="text-2xl">
                    {room.type === 'chess' ? '\u265A' : room.type === 'tictactoe' ? 'O' : '2'}
                  </span>
                ) : (
                  <span className="text-gray-400">?</span>
                )}
              </div>
              <div>
                <p className="text-white font-semibold">
                  {room.player2?.displayName || 'Waiting for opponent...'}
                </p>
                <p className="text-xs text-gray-400">
                  {room.player2 ? (room.player2.ready ? '✓ Ready' : 'Not ready') : 'Empty slot'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Share Link */}
        {!room.player2 && (
          <div className="bg-gray-700/40 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-300 mb-2">Share this link to invite an opponent:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/play/${room.id}` : `/play/${room.id}`}
                className="flex-1 bg-gray-800 text-gray-200 px-3 py-2 rounded-lg text-sm font-mono"
              />
              <button
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}/play/${room.id}` : `/play/${room.id}`;
                  navigator.clipboard?.writeText(url);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Display Name */}
      <div className="bg-gray-800/60 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">Your Display Name</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={myPlayer?.displayName || 'Enter your name'}
            maxLength={20}
            className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
          />
          <button
            onClick={handleNameSubmit}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            Set
          </button>
        </div>
      </div>

      {/* Avatar Selection */}
      <div className="bg-gray-800/60 rounded-2xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Avatar</h3>
          <button
            onClick={() => setShowAvatars(!showAvatars)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            {showAvatars ? 'Hide' : 'Choose Avatar'}
          </button>
        </div>
        {showAvatars && (
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {PRESET_AVATARS.map((avatar, i) => (
              <button
                key={i}
                onClick={() => onAvatarChange(avatar)}
                className={`w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-lg border-2 transition-colors ${
                  myPlayer?.avatar === avatar ? 'border-blue-500' : 'border-transparent hover:border-gray-400'
                }`}
              >
                {String.fromCodePoint(0x1f600 + i)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Game Settings */}
      <div className="bg-gray-800/60 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Game Settings</h3>

        {/* Time Control (chess only) */}
        {room.type === 'chess' && (
          <div className="mb-4">
            <label className="text-sm text-gray-300 mb-2 block">Time Control</label>
            <div className="flex gap-2">
              {(['blitz', 'rapid', 'classical'] as ChessVariant[]).map((variant) => (
                <button
                  key={variant}
                  onClick={() => onUpdateSettings({ variant })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    room.settings.variant === variant
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {variant.charAt(0).toUpperCase() + variant.slice(1)}
                  <span className="block text-xs text-gray-400">
                    {Math.floor(TIME_CONTROLS[variant] / 60)}min
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Board Theme */}
        <div className="mb-4">
          <label className="text-sm text-gray-300 mb-2 block">Board Theme</label>
          <div className="flex gap-2 flex-wrap">
            {BOARD_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => onUpdateSettings({ boardTheme: t.id })}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  room.settings.boardTheme === t.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div className="flex">
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: t.light }} />
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: t.dark }} />
                </div>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Piece Style (chess only) */}
        {room.type === 'chess' && (
          <div className="mb-4">
            <label className="text-sm text-gray-300 mb-2 block">Piece Style</label>
            <div className="flex gap-2 flex-wrap">
              {PIECE_STYLES.map((ps) => (
                <button
                  key={ps.id}
                  onClick={() => onUpdateSettings({ pieceStyle: ps.id })}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    (room.settings.pieceStyle || 'classic') === ps.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {ps.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Toggles */}
        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={room.settings.enableAnimations}
              onChange={(e) => onUpdateSettings({ enableAnimations: e.target.checked })}
              className="rounded bg-gray-700 border-gray-600"
            />
            Animations
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={room.settings.enableSounds}
              onChange={(e) => onUpdateSettings({ enableSounds: e.target.checked })}
              className="rounded bg-gray-700 border-gray-600"
            />
            Sounds
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={room.settings.showCoordinates !== false}
              onChange={(e) => onUpdateSettings({ showCoordinates: e.target.checked })}
              className="rounded bg-gray-700 border-gray-600"
            />
            Coordinates
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={room.settings.showLegalMoves !== false}
              onChange={(e) => onUpdateSettings({ showLegalMoves: e.target.checked })}
              className="rounded bg-gray-700 border-gray-600"
            />
            Show Legal Moves
          </label>
        </div>
      </div>

      {/* Ready Button */}
      <button
        onClick={() => onReady(!isReady)}
        disabled={!room.player2}
        className={`w-full py-4 rounded-2xl text-lg font-bold transition-all duration-300 ${
          isReady
            ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
            : 'bg-green-600 hover:bg-green-500 text-white disabled:bg-gray-700 disabled:text-gray-500'
        }`}
      >
        {!room.player2
          ? 'Waiting for opponent...'
          : isReady
          ? 'Cancel Ready'
          : "I'm Ready!"}
      </button>

      {/* Spectator Link */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Spectator link:{' '}
          <button
            onClick={() => {
              const url = typeof window !== 'undefined' ? `${window.location.origin}/spectate/${room.id}` : `/spectate/${room.id}`;
              navigator.clipboard?.writeText(url);
            }}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Copy spectator link
          </button>
        </p>
      </div>
    </div>
  );
}
