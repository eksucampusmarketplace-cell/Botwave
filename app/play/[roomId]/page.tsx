'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import type {
  GameRoom,
  GameMove,
  ChatMessage,
  GameSettings,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@/lib/game/types';
import ChessBoard from '@/components/game/ChessBoard';
import TicTacToeBoard from '@/components/game/TicTacToeBoard';
import GameLobby from '@/components/game/GameLobby';
import GameChat from '@/components/game/GameChat';
import GameTimer from '@/components/game/GameTimer';
import MoveHistory from '@/components/game/MoveHistory';
import GameResult from '@/components/game/GameResult';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('game_player_id');
  if (!id) {
    id = Math.random().toString(36).substring(2, 10);
    localStorage.setItem('game_player_id', id);
  }
  return id;
}

function getStoredName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('game_player_name') || '';
}

export default function PlayPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const socketRef = useRef<GameSocket | null>(null);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerId] = useState(getPlayerId);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Connect to socket
  useEffect(() => {
    const socketUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const socket: GameSocket = io(socketUrl, {
      path: '/api/game/socket',
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      const storedName = getStoredName();
      socket.emit('joinRoom', roomId, {
        displayName: storedName || `Player_${playerId.substring(0, 4)}`,
        avatar: '/avatars/a1.svg',
        playerId,
      });
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('error', (msg) => setError(msg));

    socket.on('roomUpdate', (updatedRoom) => {
      setRoom(updatedRoom);
      setLoading(false);
      setError(null);
    });

    socket.on('reconnected', (updatedRoom) => {
      setRoom(updatedRoom);
      setLoading(false);
      setError(null);
    });

    socket.on('gameStart', (updatedRoom) => {
      setRoom(updatedRoom);
      setShowResult(false);
    });

    socket.on('moveMade', (_move, _boardState, updatedRoom) => {
      setRoom(updatedRoom);
      try {
        const moveData = JSON.parse(_move.moveData);
        if (moveData.from && moveData.to) {
          setLastMove({ from: moveData.from, to: moveData.to });
        }
      } catch {}
    });

    socket.on('chatMessage', (msg) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const chat = [...prev.chat, msg];
        return { ...prev, chat: chat.slice(-100) };
      });
    });

    socket.on('playerJoined', () => {
      // Room update will follow
    });

    socket.on('playerLeft', () => {
      // Room update will follow
    });

    socket.on('playerReady', (pid, ready) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (updated.player1?.id === pid) updated.player1 = { ...updated.player1, ready };
        if (updated.player2?.id === pid) updated.player2 = { ...updated.player2, ready };
        return updated;
      });
    });

    socket.on('gameOver', (updatedRoom) => {
      setRoom(updatedRoom);
      setShowResult(true);
    });

    socket.on('timerUpdate', (p1Time, p2Time) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (updated.player1) updated.player1 = { ...updated.player1, timeRemaining: p1Time };
        if (updated.player2) updated.player2 = { ...updated.player2, timeRemaining: p2Time };
        return updated;
      });
    });

    socket.on('drawOffered', (pid) => {
      setRoom((prev) => prev ? { ...prev, drawOffer: pid } : prev);
    });

    socket.on('drawDeclined', () => {
      setRoom((prev) => prev ? { ...prev, drawOffer: undefined } : prev);
    });

    socket.on('undoRequested', (pid) => {
      setRoom((prev) => prev ? { ...prev, undoRequest: pid } : prev);
    });

    socket.on('undoDeclined', () => {
      setRoom((prev) => prev ? { ...prev, undoRequest: undefined } : prev);
    });

    socket.on('undoAccepted', (boardState, moves) => {
      setRoom((prev) => prev ? { ...prev, boardState, moves, undoRequest: undefined } : prev);
    });

    socket.on('spectatorUpdate', (count) => {
      setRoom((prev) => prev ? { ...prev, spectatorCount: count } : prev);
    });

    // Timeout for loading
    const timeout = setTimeout(() => {
      if (!room) {
        setLoading(false);
        setError('Could not connect to game room. The room may not exist or has expired.');
      }
    }, 10000);

    return () => {
      clearTimeout(timeout);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, playerId]);

  const handleMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!socketRef.current || !room) return;
      socketRef.current.emit('makeMove', roomId, JSON.stringify({ from, to, promotion }));
    },
    [roomId, room]
  );

  const handleTTTMove = useCallback(
    (position: number) => {
      if (!socketRef.current || !room) return;
      socketRef.current.emit('makeMove', roomId, JSON.stringify({ position }));
    },
    [roomId, room]
  );

  const handleReady = useCallback(
    (ready: boolean) => {
      socketRef.current?.emit('setReady', roomId, ready);
    },
    [roomId]
  );

  const handleUpdateSettings = useCallback(
    (settings: Partial<GameSettings>) => {
      socketRef.current?.emit('updateSettings', roomId, settings);
    },
    [roomId]
  );

  const handleNameChange = useCallback(
    (name: string) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('game_player_name', name);
      }
      // Rejoin with new name
      socketRef.current?.emit('joinRoom', roomId, {
        displayName: name,
        avatar: '/avatars/a1.svg',
        playerId,
      });
    },
    [roomId, playerId]
  );

  const handleAvatarChange = useCallback(
    (avatar: string) => {
      socketRef.current?.emit('joinRoom', roomId, {
        displayName: getStoredName() || `Player_${playerId.substring(0, 4)}`,
        avatar,
        playerId,
      });
    },
    [roomId, playerId]
  );

  const handleSendChat = useCallback(
    (message: string, type: 'player' | 'spectator' | 'emoji') => {
      socketRef.current?.emit('sendChat', roomId, message, type);
    },
    [roomId]
  );

  const handleResign = useCallback(() => {
    if (confirm('Are you sure you want to resign?')) {
      socketRef.current?.emit('resign', roomId);
    }
  }, [roomId]);

  const handleOfferDraw = useCallback(() => {
    socketRef.current?.emit('offerDraw', roomId);
  }, [roomId]);

  const handleRespondDraw = useCallback(
    (accept: boolean) => {
      socketRef.current?.emit('respondDraw', roomId, accept);
    },
    [roomId]
  );

  const handleRequestUndo = useCallback(() => {
    socketRef.current?.emit('requestUndo', roomId);
  }, [roomId]);

  const handleRespondUndo = useCallback(
    (accept: boolean) => {
      socketRef.current?.emit('respondUndo', roomId, accept);
    },
    [roomId]
  );

  const handleRematch = useCallback(async () => {
    if (!room) return;
    try {
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: room.type,
          createdBy: playerId,
          settings: room.settings,
        }),
      });
      const data = await res.json();
      if (data.roomId) {
        window.location.href = `/play/${data.roomId}`;
      }
    } catch {
      setError('Failed to create rematch');
    }
  }, [room, playerId]);

  const handleShareResult = useCallback(() => {
    if (!room) return;
    const winnerName =
      room.winner === room.player1?.id ? room.player1?.displayName : room.player2?.displayName;
    const text = room.resultType === 'draw'
      ? `Draw in ${room.type}! ${room.player1?.displayName} vs ${room.player2?.displayName} - ${room.moves.length} moves`
      : `${winnerName} wins at ${room.type}! ${room.resultType} in ${room.moves.length} moves`;

    if (navigator.share) {
      navigator.share({ title: 'Game Result - BotWave', text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
    }
  }, [room]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Connecting to game room...</p>
          <p className="text-gray-500 text-sm mt-1">Room: {roomId}</p>
        </div>
      </div>
    );
  }

  // Error
  if (error && !room) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">{'🎮'}</div>
          <h1 className="text-2xl font-bold text-white mb-2">Oops!</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  if (!room) return null;

  const isPlayer1 = room.player1?.id === playerId;
  const isPlayer2 = room.player2?.id === playerId;
  const isPlayer = isPlayer1 || isPlayer2;
  const isMyTurn = room.currentTurn === playerId;

  // Lobby phase
  if (room.status === 'waiting' || room.status === 'ready') {
    return (
      <div className="min-h-screen bg-gray-900 p-4 sm:p-8">
        <GameLobby
          room={room}
          myPlayerId={playerId}
          onReady={handleReady}
          onUpdateSettings={handleUpdateSettings}
          onNameChange={handleNameChange}
          onAvatarChange={handleAvatarChange}
        />
      </div>
    );
  }

  // In-game
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800/80 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-blue-400 capitalize">{room.type}</span>
          <span className="text-xs text-gray-500">Room: {room.id}</span>
          {!connected && (
            <span className="text-xs text-red-400 animate-pulse">Reconnecting...</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{'👁'} {room.spectatorCount}</span>
          {isMyTurn && <span className="text-green-400 font-bold">Your turn</span>}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-600/20 border-b border-red-600/40 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Draw offer banner */}
      {room.drawOffer && room.drawOffer !== playerId && isPlayer && (
        <div className="bg-yellow-600/20 border-b border-yellow-600/40 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-yellow-300">Opponent offers a draw</span>
          <div className="flex gap-2">
            <button onClick={() => handleRespondDraw(true)} className="text-xs px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-white">Accept</button>
            <button onClick={() => handleRespondDraw(false)} className="text-xs px-3 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-white">Decline</button>
          </div>
        </div>
      )}

      {/* Undo request banner */}
      {room.undoRequest && room.undoRequest !== playerId && isPlayer && (
        <div className="bg-purple-600/20 border-b border-purple-600/40 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-purple-300">Opponent requests to undo last move</span>
          <div className="flex gap-2">
            <button onClick={() => handleRespondUndo(true)} className="text-xs px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-white">Allow</button>
            <button onClick={() => handleRespondUndo(false)} className="text-xs px-3 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-white">Deny</button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto">
        {/* Main board area */}
        <div className="flex-1 flex flex-col items-center gap-4">
          {/* Opponent info */}
          <div className="w-full max-w-[560px] flex items-center justify-between bg-gray-800/40 rounded-xl px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm">
                {room.type === 'chess' ? (isPlayer1 ? '\u265A' : '\u2654') : (isPlayer1 ? 'O' : 'X')}
              </div>
              <span className="text-white font-medium">
                {isPlayer1 ? room.player2?.displayName : room.player1?.displayName}
              </span>
            </div>
            {room.currentTurn === (isPlayer1 ? room.player2?.id : room.player1?.id) && (
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
              isMyTurn={isMyTurn && isPlayer}
              myColor={isPlayer1 ? 'w' : 'b'}
              onMove={handleMove}
              theme={room.settings.boardTheme}
              lastMove={lastMove || undefined}
              isCheck={room.boardState.includes('+')}
              disabled={room.status !== 'playing' || !isPlayer}
            />
          )}

          {room.type === 'tictactoe' && (
            <TicTacToeBoard
              board={JSON.parse(room.boardState)}
              isMyTurn={isMyTurn && isPlayer}
              mySymbol={isPlayer1 ? 'X' : 'O'}
              onMove={handleTTTMove}
              disabled={room.status !== 'playing' || !isPlayer}
            />
          )}

          {/* My info */}
          <div className="w-full max-w-[560px] flex items-center justify-between bg-gray-800/40 rounded-xl px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm">
                {room.type === 'chess' ? (isPlayer1 ? '\u2654' : '\u265A') : (isPlayer1 ? 'X' : 'O')}
              </div>
              <span className="text-white font-medium">
                {isPlayer1 ? room.player1?.displayName : room.player2?.displayName} (You)
              </span>
            </div>
            {isMyTurn && (
              <span className="text-xs text-green-400 font-bold">Your turn</span>
            )}
          </div>

          {/* Game controls */}
          {isPlayer && room.status === 'playing' && (
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={handleOfferDraw}
                disabled={!!room.drawOffer}
                className="px-4 py-2 bg-yellow-600/80 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm transition-colors"
              >
                Offer Draw
              </button>
              <button
                onClick={handleRequestUndo}
                disabled={room.moves.length === 0 || !!room.undoRequest}
                className="px-4 py-2 bg-purple-600/80 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm transition-colors"
              >
                Request Undo
              </button>
              <button
                onClick={handleResign}
                className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
              >
                Resign
              </button>
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
              isSpectator={!isPlayer}
              myPlayerId={playerId}
            />
          </div>
        </div>
      </div>

      {/* Result overlay */}
      {showResult && room.status === 'finished' && (
        <GameResult
          room={room}
          myPlayerId={playerId}
          onRematch={handleRematch}
          onShareResult={handleShareResult}
        />
      )}
    </div>
  );
}
