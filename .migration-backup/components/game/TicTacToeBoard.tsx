'use client';

import React from 'react';

type Cell = 'X' | 'O' | null;

interface TicTacToeBoardProps {
  board: Cell[];
  isMyTurn: boolean;
  mySymbol: 'X' | 'O';
  onMove: (position: number) => void;
  winningLine?: number[];
  disabled?: boolean;
  theme?: string;
}

export default function TicTacToeBoard({
  board,
  isMyTurn,
  mySymbol,
  onMove,
  winningLine,
  disabled,
}: TicTacToeBoardProps) {
  const handleCellClick = (index: number) => {
    if (disabled || !isMyTurn || board[index] !== null) return;
    onMove(index);
  };

  const isWinningCell = (index: number) => winningLine?.includes(index);

  return (
    <div className="flex flex-col items-center">
      <div
        className="grid grid-cols-3 gap-2 p-4 rounded-xl bg-gray-800/50 shadow-2xl"
        style={{ maxWidth: '400px', width: '100%' }}
      >
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleCellClick(index)}
            disabled={disabled || !isMyTurn || cell !== null}
            className={`
              aspect-square flex items-center justify-center rounded-xl text-5xl sm:text-6xl font-bold
              transition-all duration-200 border-2
              ${cell === null && isMyTurn && !disabled
                ? 'hover:bg-gray-600/50 cursor-pointer border-gray-600 hover:border-gray-400'
                : 'cursor-default border-gray-700'
              }
              ${isWinningCell(index) ? 'bg-green-500/30 border-green-400 animate-pulse' : 'bg-gray-700/50'}
            `}
          >
            {cell === 'X' && (
              <span className="text-blue-400 drop-shadow-lg">X</span>
            )}
            {cell === 'O' && (
              <span className="text-red-400 drop-shadow-lg">O</span>
            )}
            {cell === null && isMyTurn && !disabled && (
              <span className="text-gray-600 text-3xl opacity-0 hover:opacity-30">
                {mySymbol}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
