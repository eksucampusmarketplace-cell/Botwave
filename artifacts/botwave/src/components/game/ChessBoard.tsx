

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { BOARD_THEMES } from '@/lib/game/types';
import { getPieceChar, fenToPieceCode, getPieceClasses, getPieceSizeMultiplier, type PieceStyle } from '@/lib/game/pieces';
import { playSound, getSoundForMove, resumeAudio } from '@/lib/game/sounds';
import { getValidMoves } from '@/lib/game/chess-engine';

interface Arrow {
  from: string;
  to: string;
  color: string;
}

interface ChessBoardProps {
  fen: string;
  isMyTurn: boolean;
  myColor: 'w' | 'b';
  onMove: (from: string, to: string, promotion?: string) => void;
  theme?: string;
  pieceStyle?: PieceStyle;
  lastMove?: { from: string; to: string };
  lastMoveSan?: string;
  isCheck?: boolean;
  disabled?: boolean;
  premovesEnabled?: boolean;
  soundEnabled?: boolean;
  animationsEnabled?: boolean;
  showCoordinates?: boolean;
  showLegalMoves?: boolean;
  highlightStyle?: 'dots' | 'squares';
  allowFlip?: boolean;
}

const PIECE_UNICODE: Record<string, string> = {
  K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
  k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function parseFen(fen: string): Record<string, string> {
  const pieces: Record<string, string> = {};
  const ranks = fen.split(' ')[0].split('/');
  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of ranks[r]) {
      if (ch >= '1' && ch <= '8') {
        f += parseInt(ch, 10);
      } else {
        const square = FILES[f] + RANKS[r];
        pieces[square] = ch;
        f++;
      }
    }
  }
  return pieces;
}

function getKingSquare(pieces: Record<string, string>, color: 'w' | 'b'): string | null {
  const king = color === 'w' ? 'K' : 'k';
  for (const [sq, piece] of Object.entries(pieces)) {
    if (piece === king) return sq;
  }
  return null;
}

export default function ChessBoard({
  fen,
  isMyTurn,
  myColor,
  onMove,
  theme = 'classic',
  pieceStyle = 'classic',
  lastMove,
  lastMoveSan,
  isCheck,
  disabled,
  premovesEnabled = true,
  soundEnabled = true,
  animationsEnabled = true,
  showCoordinates = true,
  showLegalMoves = true,
  highlightStyle = 'dots',
  allowFlip = false,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [manualFlip, setManualFlip] = useState(false);
  const [dragFrom, setDragFrom] = useState<string | null>(null);
  const [dragOverSquare, setDragOverSquare] = useState<string | null>(null);
  const [showPromotion, setShowPromotion] = useState<{ from: string; to: string } | null>(null);
  const [premove, setPremove] = useState<{ from: string; to: string } | null>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [arrowStart, setArrowStart] = useState<string | null>(null);
  const [moveAnimation, setMoveAnimation] = useState<{ to: string } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const prevFenRef = useRef(fen);

  const pieces = useMemo(() => parseFen(fen), [fen]);
  const themeColors = useMemo(
    () => BOARD_THEMES.find((t) => t.id === theme) || BOARD_THEMES[0],
    [theme]
  );

  const flipped = allowFlip ? (myColor === 'b') !== manualFlip : myColor === 'b';
  const displayFiles = flipped ? [...FILES].reverse() : FILES;
  const displayRanks = flipped ? [...RANKS].reverse() : RANKS;

  const legalMoveTargets = useMemo(() => {
    if (!selectedSquare) return new Set<string>();
    const moves = getValidMoves(fen, selectedSquare);
    return new Set(moves.map((m) => m.substring(2, 4)));
  }, [fen, selectedSquare]);

  useEffect(() => {
    if (prevFenRef.current !== fen && soundEnabled) {
      resumeAudio();
      if (lastMoveSan) {
        playSound(getSoundForMove(lastMoveSan, false));
      } else {
        playSound('move');
      }
    }
    prevFenRef.current = fen;
  }, [fen, lastMoveSan, soundEnabled]);

  useEffect(() => {
    if (isMyTurn && premove && premovesEnabled) {
      onMove(premove.from, premove.to);
      setPremove(null);
    }
  }, [isMyTurn, premove, premovesEnabled, onMove]);

  useEffect(() => {
    if (lastMove && animationsEnabled) {
      setMoveAnimation({ to: lastMove.to });
      const t = setTimeout(() => setMoveAnimation(null), 200);
      return () => clearTimeout(t);
    }
  }, [lastMove, animationsEnabled]);

  const isMyPiece = useCallback(
    (piece: string | undefined): boolean => {
      if (!piece) return false;
      return myColor === 'w' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
    },
    [myColor]
  );

  const isOpponentPiece = useCallback(
    (piece: string | undefined): boolean => {
      if (!piece) return false;
      return myColor === 'w' ? piece === piece.toLowerCase() : piece === piece.toUpperCase();
    },
    [myColor]
  );

  const handleSquareClick = useCallback(
    (square: string) => {
      setArrows([]);
      if (disabled) return;

      if (!isMyTurn && premovesEnabled) {
        if (selectedSquare) {
          if (selectedSquare === square) { setSelectedSquare(null); setPremove(null); return; }
          setPremove({ from: selectedSquare, to: square });
          if (soundEnabled) playSound('premove');
          setSelectedSquare(null);
          return;
        }
        const p = pieces[square];
        if (p && isMyPiece(p)) { setSelectedSquare(square); }
        return;
      }

      if (!isMyTurn) return;

      if (selectedSquare) {
        if (selectedSquare === square) { setSelectedSquare(null); return; }
        const clickedPiece = pieces[square];
        if (clickedPiece && isMyPiece(clickedPiece)) { setSelectedSquare(square); return; }

        const piece = pieces[selectedSquare];
        if (
          piece && (piece === 'P' || piece === 'p') &&
          ((myColor === 'w' && square[1] === '8') || (myColor === 'b' && square[1] === '1'))
        ) {
          setShowPromotion({ from: selectedSquare, to: square });
          return;
        }

        onMove(selectedSquare, square);
        setSelectedSquare(null);
      } else {
        const piece = pieces[square];
        if (piece && isMyPiece(piece)) { setSelectedSquare(square); }
      }
    },
    [selectedSquare, pieces, isMyTurn, myColor, onMove, isMyPiece, disabled, premovesEnabled, soundEnabled]
  );

  const handleDragStart = useCallback(
    (square: string, e: React.DragEvent) => {
      if (disabled) return;
      const piece = pieces[square];
      if (!piece || !isMyPiece(piece)) { e.preventDefault(); return; }
      if (!isMyTurn && !premovesEnabled) { e.preventDefault(); return; }
      setDragFrom(square);
      setSelectedSquare(square);
      e.dataTransfer.effectAllowed = 'move';
    },
    [pieces, isMyTurn, isMyPiece, disabled, premovesEnabled]
  );

  const handleDrop = useCallback(
    (square: string) => {
      if (!dragFrom || disabled) return;
      setDragOverSquare(null);

      if (!isMyTurn && premovesEnabled) {
        setPremove({ from: dragFrom, to: square });
        if (soundEnabled) playSound('premove');
        setDragFrom(null);
        setSelectedSquare(null);
        return;
      }

      const piece = pieces[dragFrom];
      if (
        piece && (piece === 'P' || piece === 'p') &&
        ((myColor === 'w' && square[1] === '8') || (myColor === 'b' && square[1] === '1'))
      ) {
        setShowPromotion({ from: dragFrom, to: square });
        setDragFrom(null);
        return;
      }

      onMove(dragFrom, square);
      setDragFrom(null);
      setSelectedSquare(null);
    },
    [dragFrom, pieces, myColor, onMove, disabled, isMyTurn, premovesEnabled, soundEnabled]
  );

  const handlePromotion = useCallback(
    (piece: string) => {
      if (!showPromotion) return;
      onMove(showPromotion.from, showPromotion.to, piece);
      setShowPromotion(null);
      setSelectedSquare(null);
    },
    [showPromotion, onMove]
  );

  const handleRightMouseDown = useCallback((square: string, e: React.MouseEvent) => {
    e.preventDefault();
    setArrowStart(square);
  }, []);

  const handleRightMouseUp = useCallback((square: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (arrowStart && arrowStart !== square) {
      setArrows((prev) => {
        const exists = prev.find((a) => a.from === arrowStart && a.to === square);
        if (exists) return prev.filter((a) => !(a.from === arrowStart && a.to === square));
        return [...prev, { from: arrowStart, to: square, color: '#f59e0b' }];
      });
    }
    setArrowStart(null);
  }, [arrowStart]);

  const kingSquare = isCheck ? getKingSquare(pieces, fen.includes(' w ') ? 'w' : 'b') : null;

  const getSquareCenter = useCallback((square: string) => {
    const fi = displayFiles.indexOf(square[0]);
    const ri = displayRanks.indexOf(square[1]);
    return { x: fi * 12.5 + 6.25, y: ri * 12.5 + 6.25 };
  }, [displayFiles, displayRanks]);

  const renderPiece = useCallback((fenChar: string) => {
    if (pieceStyle === 'classic') return PIECE_UNICODE[fenChar] || '';
    const code = fenToPieceCode(fenChar);
    if (!code) return PIECE_UNICODE[fenChar] || '';
    return getPieceChar(code, pieceStyle);
  }, [pieceStyle]);

  const getPieceStyleClasses = useCallback((fenChar: string): string => {
    const code = fenToPieceCode(fenChar);
    if (!code) return '';
    return getPieceClasses(code, pieceStyle);
  }, [pieceStyle]);

  const sizeMultiplier = getPieceSizeMultiplier(pieceStyle);

  const getSquareFromTouch = useCallback((touch: React.Touch): string | null => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const col = Math.floor((x / rect.width) * 8);
    const row = Math.floor((y / rect.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return displayFiles[col] + displayRanks[row];
  }, [displayFiles, displayRanks]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    const square = getSquareFromTouch(touch);
    if (!square) return;
    const piece = pieces[square];
    if (piece && isMyPiece(piece)) {
      e.preventDefault();
      setDragFrom(square);
      setSelectedSquare(square);
    }
  }, [disabled, pieces, isMyPiece, getSquareFromTouch]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragFrom) return;
    e.preventDefault();
    const touch = e.touches[0];
    const square = getSquareFromTouch(touch);
    setDragOverSquare(square);
  }, [dragFrom, getSquareFromTouch]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!dragFrom) return;
    e.preventDefault();
    const square = dragOverSquare;
    if (square && square !== dragFrom) {
      if (!isMyTurn && premovesEnabled) {
        setPremove({ from: dragFrom, to: square });
        if (soundEnabled) playSound('premove');
      } else if (isMyTurn) {
        const piece = pieces[dragFrom];
        if (
          piece && (piece === 'P' || piece === 'p') &&
          ((myColor === 'w' && square[1] === '8') || (myColor === 'b' && square[1] === '1'))
        ) {
          setShowPromotion({ from: dragFrom, to: square });
        } else {
          onMove(dragFrom, square);
        }
      }
    }
    setDragFrom(null);
    setDragOverSquare(null);
    setSelectedSquare(null);
  }, [dragFrom, dragOverSquare, isMyTurn, premovesEnabled, soundEnabled, pieces, myColor, onMove]);

  return (
    <div className="relative select-none" ref={boardRef}>
      {/* Board flip button */}
      {allowFlip && (
        <button
          onClick={() => setManualFlip((f) => !f)}
          className="absolute -right-10 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-700/80 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-colors z-10 text-sm"
          title="Flip board"
        >
          \u21C5
        </button>
      )}
      <div
        className="grid grid-cols-8 border-2 border-gray-700 rounded-lg overflow-hidden shadow-2xl"
        style={{ aspectRatio: '1/1', maxWidth: '560px', width: '100%' }}
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {displayRanks.map((rank, ri) =>
          displayFiles.map((file, fi) => {
            const square = file + rank;
            const piece = pieces[square];
            const isLight = (fi + ri) % 2 === 0;
            const isSelected = selectedSquare === square;
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isKingInCheck = kingSquare === square;
            const isPremoveFrom = premove?.from === square;
            const isPremoveTo = premove?.to === square;
            const isDragOver = dragOverSquare === square;
            const hasPiece = !!piece;

            let bg = isLight ? themeColors.light : themeColors.dark;
            if (isSelected) bg = isLight ? '#829769' : '#646f40';
            if (isLastMoveFrom || isLastMoveTo) bg = isLight ? '#cdd26a' : '#aaa23a';
            if (isPremoveFrom || isPremoveTo) bg = isLight ? '#a9c4f5' : '#7b9fd4';
            if (isKingInCheck) bg = '#ff4444';
            if (isDragOver) bg = isLight ? '#b8d486' : '#8aad5a';

            return (
              <div
                key={square}
                className={`relative flex items-center justify-center cursor-pointer ${animationsEnabled ? 'transition-colors duration-100' : ''}`}
                style={{ backgroundColor: bg, aspectRatio: '1/1' }}
                onClick={() => handleSquareClick(square)}
                onDragOver={(e) => { e.preventDefault(); setDragOverSquare(square); }}
                onDragLeave={() => setDragOverSquare(null)}
                onDrop={() => handleDrop(square)}
                onMouseDown={(e) => { if (e.button === 2) handleRightMouseDown(square, e); }}
                onMouseUp={(e) => { if (e.button === 2) handleRightMouseUp(square, e); }}
                onContextMenu={(e) => e.preventDefault()}
              >
                {showLegalMoves && selectedSquare && !hasPiece && isMyTurn && legalMoveTargets.has(square) && (
                  <div className={`absolute rounded-full ${highlightStyle === 'dots' ? 'w-[25%] h-[25%] bg-black/20' : 'w-full h-full border-4 border-black/20'}`} />
                )}
                {showLegalMoves && selectedSquare && hasPiece && isOpponentPiece(piece) && isMyTurn && legalMoveTargets.has(square) && (
                  <div className="absolute w-full h-full rounded-full border-[4px] border-black/25 pointer-events-none" />
                )}

                {piece && (
                  <span
                    className={`${getPieceStyleClasses(piece)} leading-none`}
                    style={{
                      fontSize: `calc(min(560px, 100vw - 2rem) / 8 * ${sizeMultiplier})`,
                      cursor: isMyPiece(piece) ? 'grab' : 'default',
                      filter: pieceStyle === 'classic'
                        ? piece === piece.toUpperCase()
                          ? 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))'
                          : 'drop-shadow(1px 1px 1px rgba(255,255,255,0.3))'
                        : undefined,
                      ...(animationsEnabled && moveAnimation?.to === square ? { animation: 'pieceAppear 0.15s ease-out' } : {}),
                    }}
                    draggable={isMyPiece(piece) && !disabled}
                    onDragStart={(e) => handleDragStart(square, e)}
                  >
                    {renderPiece(piece)}
                  </span>
                )}

                {showCoordinates && fi === 0 && (
                  <span className="absolute top-0.5 left-0.5 text-[10px] font-bold opacity-60 select-none pointer-events-none"
                    style={{ color: isLight ? themeColors.dark : themeColors.light }}>{rank}</span>
                )}
                {showCoordinates && ri === 7 && (
                  <span className="absolute bottom-0.5 right-0.5 text-[10px] font-bold opacity-60 select-none pointer-events-none"
                    style={{ color: isLight ? themeColors.dark : themeColors.light }}>{file}</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {arrows.length > 0 && (
        <svg className="absolute inset-0 pointer-events-none" style={{ maxWidth: '560px', width: '100%', aspectRatio: '1/1' }} viewBox="0 0 100 100">
          <defs>
            <marker id="arrowhead" markerWidth="3" markerHeight="3" refX="2" refY="1.5" orient="auto">
              <polygon points="0 0, 3 1.5, 0 3" fill="#f59e0b" fillOpacity="0.8" />
            </marker>
          </defs>
          {arrows.map((arrow, i) => {
            const from = getSquareCenter(arrow.from);
            const to = getSquareCenter(arrow.to);
            return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={arrow.color} strokeWidth="1.5" strokeOpacity="0.8" markerEnd="url(#arrowhead)" />;
          })}
        </svg>
      )}

      {premove && (
        <div className="absolute -bottom-8 left-0 right-0 text-center">
          <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
            Premove: {premove.from} &rarr; {premove.to}
            <button onClick={() => setPremove(null)} className="ml-2 text-red-400 hover:text-red-300">Cancel</button>
          </span>
        </div>
      )}

      {showPromotion && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg z-10">
          <div className="bg-gray-800 rounded-xl p-4 shadow-2xl border border-gray-600">
            <span className="text-sm text-gray-300 mb-3 block text-center font-medium">Promote to:</span>
            <div className="flex gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((p) => (
                <button key={p} onClick={() => handlePromotion(p)}
                  className="text-4xl p-3 hover:bg-gray-600 rounded-lg transition-colors border border-gray-600 hover:border-gray-400">
                  {PIECE_UNICODE[myColor === 'w' ? p.toUpperCase() : p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pieceAppear {
          0% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
