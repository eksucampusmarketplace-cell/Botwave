'use client';

import React from 'react';
import { GameRoom } from '@/lib/game/types';

interface GameResultProps {
  room: GameRoom;
  myPlayerId: string;
  onRematch: () => void;
  onShareResult: () => void;
  onExportPGN?: () => void;
}

export default function GameResult({ room, myPlayerId, onRematch, onShareResult, onExportPGN }: GameResultProps) {
  const isWinner = room.winner === myPlayerId;
  const isDraw = room.resultType === 'draw' || room.resultType === 'stalemate';
  const winnerPlayer = room.winner === room.player1?.id ? room.player1 : room.player2;
  const loserPlayer = room.winner === room.player1?.id ? room.player2 : room.player1;

  const resultText = isDraw
    ? 'Draw!'
    : isWinner
    ? 'You Win!'
    : 'You Lose!';

  const resultColor = isDraw
    ? 'text-yellow-400'
    : isWinner
    ? 'text-green-400'
    : 'text-red-400';

  const reasonText: Record<string, string> = {
    checkmate: 'by checkmate',
    resign: 'by resignation',
    timeout: 'on time',
    draw: 'by agreement',
    stalemate: 'by stalemate',
    abandon: 'by abandonment',
  };

  const duration = room.moves.length > 0
    ? Math.round((room.moves[room.moves.length - 1].timestamp - room.createdAt) / 1000)
    : 0;
  const durationMin = Math.floor(duration / 60);
  const durationSec = duration % 60;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-600 shadow-2xl animate-in fade-in zoom-in">
        <div className="text-center mb-6">
          <div className={`text-5xl font-black mb-2 ${resultColor}`}>
            {resultText}
          </div>
          <p className="text-gray-400">
            {isDraw ? 'Game drawn' : `${winnerPlayer?.displayName || 'Player'} wins`}{' '}
            {reasonText[room.resultType || ''] || ''}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{room.moves.length}</p>
            <p className="text-xs text-gray-400">Moves</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {durationMin}:{durationSec.toString().padStart(2, '0')}
            </p>
            <p className="text-xs text-gray-400">Duration</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{room.spectatorCount}</p>
            <p className="text-xs text-gray-400">Spectators</p>
          </div>
        </div>

        {/* Players */}
        <div className="flex items-center justify-between bg-gray-700/40 rounded-xl p-4 mb-6">
          <div className="text-center flex-1">
            <p className="text-white font-semibold">{room.player1?.displayName}</p>
            <p className={`text-sm ${room.winner === room.player1?.id ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400'}`}>
              {room.winner === room.player1?.id ? 'Winner' : isDraw ? 'Draw' : 'Lost'}
            </p>
          </div>
          <div className="text-gray-500 text-2xl font-bold px-4">vs</div>
          <div className="text-center flex-1">
            <p className="text-white font-semibold">{room.player2?.displayName}</p>
            <p className={`text-sm ${room.winner === room.player2?.id ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400'}`}>
              {room.winner === room.player2?.id ? 'Winner' : isDraw ? 'Draw' : 'Lost'}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onRematch}
            className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors"
          >
            Rematch
          </button>
          <button
            onClick={onShareResult}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
          >
            Share Result
          </button>
        </div>
        {onExportPGN && room.type === 'chess' && (
          <button
            onClick={onExportPGN}
            className="w-full mt-2 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition-colors"
          >
            Download PGN
          </button>
        )}
      </div>
    </div>
  );
}
