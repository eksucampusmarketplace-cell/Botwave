'use client';

import React, { useRef, useEffect } from 'react';
import { GameMove } from '@/lib/game/types';

interface MoveHistoryProps {
  moves: GameMove[];
  gameType: string;
  currentMoveIndex?: number;
  onMoveClick?: (moveIndex: number) => void;
}

function getMoveStyle(notation: string): string {
  if (notation.includes('#')) return 'text-red-400 font-bold';
  if (notation.includes('+')) return 'text-orange-300';
  if (notation.includes('x')) return 'text-yellow-200';
  if (notation.startsWith('O-')) return 'text-blue-300';
  return '';
}

function getMoveIcon(notation: string): string {
  if (notation.includes('#')) return '';
  if (notation.includes('+')) return '';
  if (notation.includes('x')) return '';
  return '';
}

export default function MoveHistory({ moves, gameType, currentMoveIndex, onMoveClick }: MoveHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves]);

  if (gameType !== 'chess') {
    return (
      <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-3">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Moves</h3>
        <div ref={scrollRef} className="max-h-48 overflow-y-auto space-y-1">
          {moves.map((move, i) => (
            <div key={i} className="text-sm text-gray-400">
              {i + 1}. {move.notation || move.moveData}
            </div>
          ))}
          {moves.length === 0 && (
            <p className="text-sm text-gray-500">No moves yet</p>
          )}
        </div>
      </div>
    );
  }

  const pairs: Array<{ num: number; white?: string; black?: string; whiteIdx: number; blackIdx: number }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i]?.notation || '...',
      black: moves[i + 1]?.notation,
      whiteIdx: i,
      blackIdx: i + 1,
    });
  }

  return (
    <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-300">Move History</h3>
        <span className="text-xs text-gray-500">{moves.length} moves</span>
      </div>
      <div ref={scrollRef} className="max-h-48 overflow-y-auto">
        {pairs.length === 0 && (
          <p className="text-sm text-gray-500">No moves yet</p>
        )}
        {pairs.map((pair) => (
          <div key={pair.num} className="flex text-sm font-mono py-0.5 hover:bg-gray-700/30 rounded px-1">
            <span className="w-8 text-gray-500 shrink-0">{pair.num}.</span>
            <span
              className={`w-20 shrink-0 cursor-default ${
                currentMoveIndex === pair.whiteIdx ? 'bg-blue-600/30 rounded px-1' : ''
              } ${pair.white ? getMoveStyle(pair.white) : 'text-white'}`}
              onClick={() => onMoveClick?.(pair.whiteIdx)}
              title={pair.white && pair.white.includes('x') ? 'Capture' : pair.white && pair.white.includes('+') ? 'Check' : pair.white && pair.white.includes('#') ? 'Checkmate' : undefined}
            >
              {getMoveIcon(pair.white || '')}{pair.white}
            </span>
            {pair.black && (
              <span
                className={`w-20 shrink-0 cursor-default ${
                  currentMoveIndex === pair.blackIdx ? 'bg-blue-600/30 rounded px-1' : ''
                } ${getMoveStyle(pair.black) || 'text-gray-300'}`}
                onClick={() => onMoveClick?.(pair.blackIdx)}
                title={pair.black.includes('x') ? 'Capture' : pair.black.includes('+') ? 'Check' : pair.black.includes('#') ? 'Checkmate' : undefined}
              >
                {getMoveIcon(pair.black)}{pair.black}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
