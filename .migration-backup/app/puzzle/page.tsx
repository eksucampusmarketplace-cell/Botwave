'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ChessBoard from '@/components/game/ChessBoard';
import { getDailyPuzzle, getRandomPuzzle, type ChessPuzzle } from '@/lib/game/puzzles';

type PuzzleState = 'solving' | 'correct' | 'wrong' | 'complete';

function uciToSquares(uci: string): { from: string; to: string } {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}

export default function PuzzlePage() {
  const [puzzle, setPuzzle] = useState<ChessPuzzle | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [fen, setFen] = useState('');
  const [state, setState] = useState<PuzzleState>('solving');
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | undefined>();
  const [streak, setStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [mode, setMode] = useState<'daily' | 'random'>('daily');
  const [history, setHistory] = useState<Array<{ id: string; result: 'correct' | 'wrong' }>>([]);

  const loadPuzzle = useCallback((p: ChessPuzzle) => {
    setPuzzle(p);
    setFen(p.fen);
    setCurrentMoveIndex(0);
    setState('solving');
    setLastMove(undefined);
  }, []);

  useEffect(() => {
    loadPuzzle(getDailyPuzzle());
  }, [loadPuzzle]);

  const playerColor = useMemo((): 'w' | 'b' => {
    if (!puzzle) return 'w';
    return puzzle.fen.includes(' w ') ? 'w' : 'b';
  }, [puzzle]);

  const handleMove = useCallback((from: string, to: string) => {
    if (!puzzle || state !== 'solving') return;

    const uciMove = from + to;
    const expectedMove = puzzle.moves[currentMoveIndex];

    if (uciMove === expectedMove) {
      setLastMove({ from, to });

      if (currentMoveIndex + 1 >= puzzle.moves.length) {
        setState('complete');
        setStreak((s) => s + 1);
        setTotalSolved((t) => t + 1);
        setHistory((h) => [...h, { id: puzzle.id, result: 'correct' }]);
      } else {
        setState('correct');
        setCurrentMoveIndex(currentMoveIndex + 1);

        // Auto-play opponent response after a short delay if there are more moves
        if (currentMoveIndex + 1 < puzzle.moves.length) {
          setTimeout(() => {
            const opponentMove = puzzle.moves[currentMoveIndex + 1];
            if (opponentMove) {
              const { from: oFrom, to: oTo } = uciToSquares(opponentMove);
              setLastMove({ from: oFrom, to: oTo });
              setCurrentMoveIndex((prev) => prev + 1);

              if (currentMoveIndex + 2 >= puzzle.moves.length) {
                setState('complete');
                setStreak((s) => s + 1);
                setTotalSolved((t) => t + 1);
                setHistory((h) => [...h, { id: puzzle.id, result: 'correct' }]);
              } else {
                setState('solving');
              }
            }
          }, 500);
        }
      }
    } else {
      setState('wrong');
      setStreak(0);
      setHistory((h) => [...h, { id: puzzle.id, result: 'wrong' }]);
    }
  }, [puzzle, state, currentMoveIndex]);

  const handleNext = useCallback(() => {
    if (mode === 'daily') {
      loadPuzzle(getRandomPuzzle());
      setMode('random');
    } else {
      loadPuzzle(getRandomPuzzle());
    }
  }, [mode, loadPuzzle]);

  const handleRetry = useCallback(() => {
    if (puzzle) loadPuzzle(puzzle);
  }, [puzzle, loadPuzzle]);

  if (!puzzle) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span>{'🧩'}</span> Chess Puzzles
            </h1>
            <p className="text-sm text-gray-400">
              {mode === 'daily' ? 'Daily Puzzle' : 'Random Puzzle'} &middot; Rating: {puzzle.rating}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-orange-400">{streak}</div>
              <div className="text-[10px] text-gray-500">Streak</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{totalSolved}</div>
              <div className="text-[10px] text-gray-500">Solved</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Board */}
          <div className="lg:col-span-2">
            <div className="flex justify-center">
              <ChessBoard
                fen={fen}
                isMyTurn={state === 'solving'}
                myColor={playerColor}
                onMove={handleMove}
                lastMove={lastMove}
                disabled={state !== 'solving'}
                soundEnabled={true}
                animationsEnabled={true}
                showCoordinates={true}
                showLegalMoves={true}
              />
            </div>

            {/* Status banner */}
            <div className={`mt-4 rounded-xl p-4 text-center ${
              state === 'solving' ? 'bg-blue-500/10 border border-blue-500/30' :
              state === 'correct' ? 'bg-green-500/10 border border-green-500/30' :
              state === 'complete' ? 'bg-green-500/20 border border-green-500/50' :
              'bg-red-500/10 border border-red-500/30'
            }`}>
              {state === 'solving' && (
                <p className="text-blue-400 font-medium">
                  {'🤔'} Find the best move for {playerColor === 'w' ? 'White' : 'Black'}
                </p>
              )}
              {state === 'correct' && (
                <p className="text-green-400 font-medium">
                  {'✓'} Correct! Keep going...
                </p>
              )}
              {state === 'complete' && (
                <div>
                  <p className="text-green-400 font-bold text-lg mb-2">{'🎉'} Puzzle Complete!</p>
                  <button onClick={handleNext} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors">
                    Next Puzzle
                  </button>
                </div>
              )}
              {state === 'wrong' && (
                <div>
                  <p className="text-red-400 font-bold mb-2">{'✗'} Incorrect</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={handleRetry} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                      Retry
                    </button>
                    <button onClick={handleNext} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors">
                      Next Puzzle
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Puzzle info */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="font-semibold text-lg mb-1">{puzzle.title}</h3>
              <p className="text-sm text-gray-400 mb-3">{puzzle.description}</p>
              <div className="flex flex-wrap gap-1">
                {puzzle.themes.map((theme) => (
                  <span key={theme} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                    {theme}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-500">Difficulty:</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`text-xs ${puzzle.rating >= star * 300 ? 'text-yellow-400' : 'text-gray-700'}`}>
                      {'★'}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-gray-500">{puzzle.rating}</span>
              </div>
            </div>

            {/* Mode selection */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h4 className="text-sm font-semibold mb-2">Mode</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => { setMode('daily'); loadPuzzle(getDailyPuzzle()); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm ${mode === 'daily' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                >
                  {'📅'} Daily
                </button>
                <button
                  onClick={() => { setMode('random'); loadPuzzle(getRandomPuzzle()); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm ${mode === 'random' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                >
                  {'🎲'} Random
                </button>
              </div>
            </div>

            {/* History */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h4 className="text-sm font-semibold mb-2">Session History</h4>
              {history.length === 0 ? (
                <p className="text-xs text-gray-600">No puzzles attempted yet</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {history.map((h, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                        h.result === 'correct' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {h.result === 'correct' ? '✓' : '✗'}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h4 className="text-sm font-semibold mb-2">{'💡'} Tips</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>&bull; Look for checks, captures, and threats</li>
                <li>&bull; Consider your opponent&apos;s responses</li>
                <li>&bull; Visualize the position after each move</li>
                <li>&bull; Daily puzzles reset every day</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
