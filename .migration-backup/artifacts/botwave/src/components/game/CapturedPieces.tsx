

import React, { useMemo } from 'react';

interface CapturedPiecesProps {
  fen: string;
  myColor: 'w' | 'b';
  position?: 'top' | 'bottom';
}

const INITIAL_PIECES: Record<string, number> = {
  P: 8, R: 2, N: 2, B: 2, Q: 1, K: 1,
  p: 8, r: 2, n: 2, b: 2, q: 1, k: 1,
};

const PIECE_VALUES: Record<string, number> = {
  P: 1, N: 3, B: 3, R: 5, Q: 9,
  p: 1, n: 3, b: 3, r: 5, q: 9,
};

const PIECE_UNICODE: Record<string, string> = {
  P: '\u2659', R: '\u2656', N: '\u2658', B: '\u2657', Q: '\u2655',
  p: '\u265F', r: '\u265C', n: '\u265E', b: '\u265D', q: '\u265B',
};

const PIECE_ORDER = ['Q', 'R', 'B', 'N', 'P'];

export default function CapturedPieces({ fen, myColor, position = 'top' }: CapturedPiecesProps) {
  const { captured, advantage } = useMemo(() => {
    const boardPieces: Record<string, number> = {};
    const fenBoard = fen.split(' ')[0];
    for (const ch of fenBoard) {
      if (ch >= 'A' && ch <= 'Z' || ch >= 'a' && ch <= 'z') {
        if (ch !== '/') {
          boardPieces[ch] = (boardPieces[ch] || 0) + 1;
        }
      }
    }

    const whiteCaptured: string[] = [];
    const blackCaptured: string[] = [];

    for (const [piece, initial] of Object.entries(INITIAL_PIECES)) {
      if (piece === 'K' || piece === 'k') continue;
      const onBoard = boardPieces[piece] || 0;
      const diff = initial - onBoard;
      for (let i = 0; i < diff; i++) {
        if (piece === piece.toUpperCase()) {
          blackCaptured.push(piece);
        } else {
          whiteCaptured.push(piece);
        }
      }
    }

    let whiteValue = 0;
    let blackValue = 0;
    for (const p of whiteCaptured) whiteValue += PIECE_VALUES[p] || 0;
    for (const p of blackCaptured) blackValue += PIECE_VALUES[p] || 0;

    return {
      captured: {
        white: whiteCaptured,
        black: blackCaptured,
      },
      advantage: whiteValue - blackValue,
    };
  }, [fen]);

  const showColor = position === 'top'
    ? (myColor === 'w' ? 'white' : 'black')
    : (myColor === 'w' ? 'black' : 'white');

  const pieces = showColor === 'white' ? captured.white : captured.black;
  const adv = showColor === 'white' ? advantage : -advantage;

  const sortedPieces = [...pieces].sort((a, b) => {
    const aIdx = PIECE_ORDER.indexOf(a.toUpperCase());
    const bIdx = PIECE_ORDER.indexOf(b.toUpperCase());
    return aIdx - bIdx;
  });

  if (sortedPieces.length === 0 && adv <= 0) return null;

  return (
    <div className="flex items-center gap-0.5 min-h-[20px]">
      <div className="flex items-center">
        {sortedPieces.map((piece, i) => (
          <span
            key={i}
            className="text-sm opacity-70 -mr-0.5"
            style={{ fontSize: '14px' }}
          >
            {PIECE_UNICODE[piece] || piece}
          </span>
        ))}
      </div>
      {adv > 0 && (
        <span className="text-xs text-gray-400 ml-1 font-medium">+{adv}</span>
      )}
    </div>
  );
}
