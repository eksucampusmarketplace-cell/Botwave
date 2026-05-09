'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import ChessBoard from '@/components/game/ChessBoard';
import TicTacToeBoard from '@/components/game/TicTacToeBoard';
import { getOpeningForMoveList } from '@/lib/game/openings';

interface ReviewData {
  roomId: string;
  gameType: 'chess' | 'tictactoe';
  player1: { displayName: string; rating: number };
  player2: { displayName: string; rating: number };
  result: { winner: string; type: string };
  moves: Array<{ san: string; from: string; to: string; fen: string; timestamp: number }>;
  startFen: string;
  settings: { timeControl: string };
}

export default function ReviewPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [review, setReview] = useState<ReviewData | null>(null);
  const [currentMove, setCurrentMove] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1500);

  useEffect(() => {
    async function fetchReview() {
      try {
        const res = await fetch(`/api/game/review?roomId=${encodeURIComponent(roomId)}`);
        if (res.ok) {
          const data = await res.json();
          setReview(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchReview();
  }, [roomId]);

  // Auto-play
  useEffect(() => {
    if (!autoPlay || !review) return;
    if (currentMove >= review.moves.length) {
      setAutoPlay(false);
      return;
    }
    const timer = setTimeout(() => {
      setCurrentMove((prev) => prev + 1);
    }, playSpeed);
    return () => clearTimeout(timer);
  }, [autoPlay, currentMove, review, playSpeed]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentMove((prev) => Math.max(0, prev - 1));
        setAutoPlay(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentMove((prev) => Math.min(review?.moves.length || 0, prev + 1));
        setAutoPlay(false);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentMove(0);
        setAutoPlay(false);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentMove(review?.moves.length || 0);
        setAutoPlay(false);
      } else if (e.key === ' ') {
        e.preventDefault();
        setAutoPlay((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [review]);

  const currentFen = useMemo(() => {
    if (!review) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    if (currentMove === 0) return review.startFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    return review.moves[currentMove - 1]?.fen || review.startFen;
  }, [review, currentMove]);

  const lastMove = useMemo(() => {
    if (!review || currentMove === 0) return undefined;
    const move = review.moves[currentMove - 1];
    return move ? { from: move.from, to: move.to } : undefined;
  }, [review, currentMove]);

  const currentSan = useMemo(() => {
    if (!review || currentMove === 0) return undefined;
    return review.moves[currentMove - 1]?.san;
  }, [review, currentMove]);

  const opening = useMemo(() => {
    if (!review || review.gameType !== 'chess') return null;
    const sanMoves = review.moves.slice(0, currentMove).map((m) => m.san);
    return getOpeningForMoveList(sanMoves);
  }, [review, currentMove]);

  const goToMove = useCallback((index: number) => {
    setCurrentMove(index);
    setAutoPlay(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">{'📋'}</div>
          <h2 className="text-xl font-bold text-white mb-2">Game Not Found</h2>
          <p className="text-gray-400">This game review is not available.</p>
        </div>
      </div>
    );
  }

  const totalMoves = review.moves.length;
  const isChess = review.gameType === 'chess';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Game Review</h1>
            <p className="text-sm text-gray-400">
              {review.player1.displayName} vs {review.player2.displayName}
              {opening && <span className="ml-2 text-purple-400">&middot; {opening.name}</span>}
            </p>
          </div>
          <div className="text-right text-sm">
            <div className="text-gray-400">{review.gameType === 'chess' ? '♟ Chess' : '⭕ Tic-Tac-Toe'}</div>
            <div className="text-gray-500">{review.settings?.timeControl || 'Untimed'}</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Board */}
          <div className="lg:col-span-2">
            {/* Player info top */}
            <div className="flex items-center gap-3 mb-3 bg-gray-900 rounded-lg px-4 py-2 border border-gray-800">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                {review.player2.displayName[0]?.toUpperCase()}
              </div>
              <div>
                <span className="font-medium">{review.player2.displayName}</span>
                <span className="text-gray-500 text-sm ml-2">({review.player2.rating})</span>
              </div>
            </div>

            {/* Board */}
            <div className="flex justify-center">
              {isChess ? (
                <ChessBoard
                  fen={currentFen}
                  isMyTurn={false}
                  myColor="w"
                  onMove={() => {}}
                  lastMove={lastMove}
                  lastMoveSan={currentSan}
                  disabled={true}
                  showCoordinates={true}
                  soundEnabled={false}
                />
              ) : (
                <TicTacToeBoard
                  board={currentFen}
                  isMyTurn={false}
                  mySymbol="X"
                  onMove={() => {}}
                  disabled={true}
                />
              )}
            </div>

            {/* Player info bottom */}
            <div className="flex items-center gap-3 mt-3 bg-gray-900 rounded-lg px-4 py-2 border border-gray-800">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">
                {review.player1.displayName[0]?.toUpperCase()}
              </div>
              <div>
                <span className="font-medium">{review.player1.displayName}</span>
                <span className="text-gray-500 text-sm ml-2">({review.player1.rating})</span>
              </div>
            </div>

            {/* Playback controls */}
            <div className="mt-4 bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => goToMove(0)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white" title="Start (Home)">
                  {'⏮'}
                </button>
                <button onClick={() => goToMove(Math.max(0, currentMove - 1))} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white" title="Previous (←)">
                  {'◀'}
                </button>
                <button
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`p-3 rounded-xl ${autoPlay ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} text-white font-bold`}
                  title="Play/Pause (Space)"
                >
                  {autoPlay ? '⏸' : '▶'}
                </button>
                <button onClick={() => goToMove(Math.min(totalMoves, currentMove + 1))} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white" title="Next (→)">
                  {'▶'}
                </button>
                <button onClick={() => goToMove(totalMoves)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white" title="End (End)">
                  {'⏭'}
                </button>
              </div>

              {/* Progress bar */}
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-500 w-12 text-right">{currentMove}/{totalMoves}</span>
                <input
                  type="range"
                  min={0}
                  max={totalMoves}
                  value={currentMove}
                  onChange={(e) => goToMove(parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Speed control */}
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-xs text-gray-500">Speed:</span>
                {[3000, 1500, 800, 400].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaySpeed(speed)}
                    className={`text-xs px-2 py-1 rounded ${playSpeed === speed ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                  >
                    {speed === 3000 ? '0.5x' : speed === 1500 ? '1x' : speed === 800 ? '2x' : '4x'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Move list sidebar */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col max-h-[700px]">
            <div className="px-4 py-3 border-b border-gray-800">
              <h3 className="font-semibold">Moves</h3>
              {opening && (
                <p className="text-xs text-purple-400 mt-1">{opening.name}</p>
              )}
            </div>

            {isChess ? (
              <div className="flex-1 overflow-y-auto p-2">
                {Array.from({ length: Math.ceil(totalMoves / 2) }, (_, i) => {
                  const whiteIdx = i * 2;
                  const blackIdx = i * 2 + 1;
                  const whiteMove = review.moves[whiteIdx];
                  const blackMove = review.moves[blackIdx];
                  return (
                    <div key={i} className="flex items-center text-sm">
                      <span className="w-8 text-gray-600 text-right mr-2">{i + 1}.</span>
                      <button
                        onClick={() => goToMove(whiteIdx + 1)}
                        className={`flex-1 px-2 py-1 rounded text-left hover:bg-gray-700 ${
                          currentMove === whiteIdx + 1 ? 'bg-purple-600/30 text-purple-300' : 'text-gray-300'
                        }`}
                      >
                        {whiteMove?.san}
                      </button>
                      {blackMove && (
                        <button
                          onClick={() => goToMove(blackIdx + 1)}
                          className={`flex-1 px-2 py-1 rounded text-left hover:bg-gray-700 ${
                            currentMove === blackIdx + 1 ? 'bg-purple-600/30 text-purple-300' : 'text-gray-300'
                          }`}
                        >
                          {blackMove.san}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-2">
                {review.moves.map((move, i) => (
                  <button
                    key={i}
                    onClick={() => goToMove(i + 1)}
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-700 ${
                      currentMove === i + 1 ? 'bg-purple-600/30 text-purple-300' : 'text-gray-300'
                    }`}
                  >
                    Move {i + 1}: {move.san}
                  </button>
                ))}
              </div>
            )}

            {/* Result */}
            <div className="px-4 py-3 border-t border-gray-800 text-center">
              <div className="text-lg font-bold">
                {review.result.winner === 'draw' ? 'Draw' : `${review.result.winner} wins`}
              </div>
              <div className="text-xs text-gray-500">by {review.result.type}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
