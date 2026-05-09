'use client';

import React, { useRef, useEffect } from 'react';
import { GameMove } from '@/lib/game/types';

interface MoveHistoryProps {
  moves: GameMove[];
  gameType: string;
}

export default function MoveHistory({ moves, gameType }: MoveHistoryProps) {
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

  // Chess: display in paired notation (1. e4 e5  2. Nf3 Nc6 ...)
  const pairs: Array<{ num: number; white?: string; black?: string }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      num: Math.floor(i / 2) + 1,
      white: moves[i]?.notation || '...',
      black: moves[i + 1]?.notation,
    });
  }

  return (
    <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-3">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Move History</h3>
      <div ref={scrollRef} className="max-h-48 overflow-y-auto">
        {pairs.length === 0 && (
          <p className="text-sm text-gray-500">No moves yet</p>
        )}
        {pairs.map((pair) => (
          <div key={pair.num} className="flex text-sm font-mono py-0.5">
            <span className="w-8 text-gray-500">{pair.num}.</span>
            <span className="w-16 text-white">{pair.white}</span>
            <span className="w-16 text-gray-300">{pair.black || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
