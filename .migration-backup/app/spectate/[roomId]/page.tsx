'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import type {
  GameRoom,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@/lib/game/types';
import ChessBoard from '@/components/game/ChessBoard';
import TicTacToeBoard from '@/components/game/TicTacToeBoard';
import GameChat from '@/components/game/GameChat';
import MoveHistory from '@/components/game/MoveHistory';
import GameTimer from '@/components/game/GameTimer';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export default function SpectatePage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const socketRef = useRef<GameSocket | null>(null);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const spectatorId = useRef(Math.random().toString(36).substring(2, 10));

  useEffect(() => {
    const socketUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const socket: GameSocket = io(socketUrl, {
      path: '/api/game/socket',
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('spectateRoom', roomId);
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('error', (msg) => setError(msg));

    socket.on('roomUpdate', (updatedRoom) => {
      setRoom(updatedRoom);
      setLoading(false);
    });

    socket.on('gameStart', (updatedRoom) => setRoom(updatedRoom));

    socket.on('moveMade', (_move, _boardState, updatedRoom) => {
      setRoom(updatedRoom);
    });

    socket.on('chatMessage', (msg) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, chat: [...prev.chat, msg].slice(-100) };
      });
    });

    socket.on('gameOver', (updatedRoom) => setRoom(updatedRoom));

    socket.on('timerUpdate', (p1Time, p2Time) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (updated.player1) updated.player1 = { ...updated.player1, timeRemaining: p1Time };
        if (updated.player2) updated.player2 = { ...updated.player2, timeRemaining: p2Time };
        return updated;
      });
    });

    socket.on('spectatorUpdate', (count) => {
      setRoom((prev) => prev ? { ...prev, spectatorCount: count } : prev);
    });

    const timeout = setTimeout(() => {
      if (!room) {
        setLoading(false);
        setError('Could not connect to game room.');
      }
    }, 10000);

    return () => {
      clearTimeout(timeout);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleSendChat = useCallback(
    (message: string, type: 'player' | 'spectator' | 'emoji') => {
      socketRef.current?.emit('sendChat', roomId, message, type);
    },
    [roomId]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Joining as spectator...</p>
        </div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">{'👁'}</div>
          <h1 className="text-2xl font-bold text-white mb-2">Cannot Spectate</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <a href="/" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  if (!room) return null;

  const isWaiting = room.status === 'waiting' || room.status === 'ready';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-purple-900/40 border-b border-purple-700/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-0.5 bg-purple-600 rounded-full font-bold">SPECTATING</span>
          <span className="text-sm font-bold text-purple-300 capitalize">{room.type}</span>
          <span className="text-xs text-gray-500">Room: {room.id}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span>{'👁'} {room.spectatorCount} watching</span>
          {!connected && <span className="text-red-400 text-xs">Reconnecting...</span>}
        </div>
      </div>

      {/* Spectator delay notice */}
      <div className="bg-yellow-900/20 border-b border-yellow-700/30 px-4 py-1 text-center">
        <span className="text-xs text-yellow-400/70">Spectator view has a ~3 second delay</span>
      </div>

      {isWaiting ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">{'⏳'}</div>
            <h2 className="text-xl font-bold text-white mb-2">Game has not started yet</h2>
            <p className="text-gray-400">
              {room.player1?.displayName || 'Player 1'} vs {room.player2?.displayName || 'Waiting...'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto">
          {/* Board area */}
          <div className="flex-1 flex flex-col items-center gap-4">
            {/* Player 2 (top) */}
            <div className="w-full max-w-[560px] flex items-center justify-between bg-gray-800/40 rounded-xl px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{room.player2?.displayName || 'Player 2'}</span>
              </div>
              {room.currentTurn === room.player2?.id && room.status === 'playing' && (
                <span className="text-xs text-yellow-400 animate-pulse">Thinking...</span>
              )}
            </div>

            {/* Timer */}
            {room.type === 'chess' && room.settings.timeControl && (
              <div className="w-full max-w-[560px]">
                <GameTimer
                  timeWhite={room.player1?.timeRemaining || 0}
                  timeBlack={room.player2?.timeRemaining || 0}
                  activeColor={room.currentTurn === room.player1?.id ? 'w' : 'b'}
                  isPlaying={room.status === 'playing'}
                />
              </div>
            )}

            {/* Board */}
            {room.type === 'chess' && (
              <ChessBoard
                fen={room.boardState}
                isMyTurn={false}
                myColor="w"
                onMove={() => {}}
                theme={room.settings.boardTheme}
                disabled={true}
              />
            )}

            {room.type === 'tictactoe' && (
              <TicTacToeBoard
                board={JSON.parse(room.boardState)}
                isMyTurn={false}
                mySymbol="X"
                onMove={() => {}}
                disabled={true}
              />
            )}

            {/* Player 1 (bottom) */}
            <div className="w-full max-w-[560px] flex items-center justify-between bg-gray-800/40 rounded-xl px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{room.player1?.displayName || 'Player 1'}</span>
              </div>
              {room.currentTurn === room.player1?.id && room.status === 'playing' && (
                <span className="text-xs text-yellow-400 animate-pulse">Thinking...</span>
              )}
            </div>

            {/* Game over */}
            {room.status === 'finished' && (
              <div className="bg-gray-800/60 rounded-xl p-4 text-center border border-gray-600">
                <p className="text-xl font-bold text-white mb-1">Game Over</p>
                <p className="text-gray-400">
                  {room.resultType === 'draw' || room.resultType === 'stalemate'
                    ? 'Draw'
                    : `${room.winner === room.player1?.id ? room.player1?.displayName : room.player2?.displayName} wins by ${room.resultType}`}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 flex flex-col gap-4">
            <MoveHistory moves={room.moves} gameType={room.type} />
            <div className="flex-1 min-h-[300px]">
              <GameChat
                messages={room.chat}
                onSendMessage={handleSendChat}
                isSpectator={true}
                myPlayerId={spectatorId.current}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
