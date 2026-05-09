import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import {
  GameRoom,
  GameMove,
  ChatMessage,
  PlayerInfo,
  GameSettings,
  GameType,
  DEFAULT_SETTINGS,
  TIME_CONTROLS,
  ChessVariant,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../lib/game/types';
import {
  validateAndMakeMove as chessMove,
  getInitialFen,
  getCurrentTurn as chessGetTurn,
  isGameOver as chessIsGameOver,
} from '../lib/game/chess-engine';
import {
  validateAndMakeMove as tttMove,
  getInitialBoard as tttInitialBoard,
  getCurrentTurn as tttGetTurn,
  isGameOver as tttIsGameOver,
} from '../lib/game/tictactoe-engine';
import { calculateElo, DEFAULT_RATING } from '../lib/game/elo';

const REDIS_URL = process.env.REDIS_URL;
const ROOM_TTL = 1800; // 30 minutes
const SPECTATOR_DELAY_MS = 2500;

let redis: Redis | null = null;
let redisSub: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (!REDIS_URL) return null;
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 500, 3000);
      },
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redis.connect().catch(() => {});
    return redis;
  } catch {
    return null;
  }
}

// In-memory fallback when Redis is unavailable
const memoryRooms = new Map<string, GameRoom>();
const memoryTimers = new Map<string, NodeJS.Timeout>();

function roomKey(roomId: string): string {
  return `game:room:${roomId}`;
}
function playerRoomKey(playerId: string): string {
  return `game:player:${playerId}`;
}
function ratingKey(userId: string, gameType: string): string {
  return `game:rating:${userId}:${gameType}`;
}
function leaderboardKey(gameType: string): string {
  return `game:leaderboard:${gameType}`;
}
function statsKey(userId: string): string {
  return `game:stats:${userId}`;
}

async function getRoom(roomId: string): Promise<GameRoom | null> {
  const r = getRedis();
  if (r) {
    try {
      const data = await r.get(roomKey(roomId));
      if (data) return JSON.parse(data);
    } catch {}
  }
  return memoryRooms.get(roomId) || null;
}

async function saveRoom(room: GameRoom): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.set(roomKey(room.id), JSON.stringify(room), 'EX', ROOM_TTL);
      return;
    } catch {}
  }
  memoryRooms.set(room.id, room);
}

async function deleteRoom(roomId: string): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.del(roomKey(roomId));
    } catch {}
  }
  memoryRooms.delete(roomId);
}

async function getRating(userId: string, gameType: string): Promise<number> {
  const r = getRedis();
  if (r) {
    try {
      const val = await r.get(ratingKey(userId, gameType));
      if (val) return parseInt(val, 10);
    } catch {}
  }
  return DEFAULT_RATING;
}

async function setRating(userId: string, gameType: string, rating: number): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.set(ratingKey(userId, gameType), rating.toString());
      await r.zadd(leaderboardKey(gameType), rating, userId);
    } catch {}
  }
}

async function updateStats(
  userId: string,
  gameType: string,
  result: 'win' | 'loss' | 'draw'
): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      const key = statsKey(userId);
      await r.hincrby(key, `${gameType}:${result}s`, 1);
      await r.hincrby(key, `${gameType}:games`, 1);
    } catch {}
  }
}

async function getStats(userId: string): Promise<Record<string, Record<string, number>>> {
  const r = getRedis();
  const stats: Record<string, Record<string, number>> = {};
  if (r) {
    try {
      const data = await r.hgetall(statsKey(userId));
      for (const [key, val] of Object.entries(data)) {
        const [gameType, stat] = key.split(':');
        if (!stats[gameType]) stats[gameType] = {};
        stats[gameType][stat] = parseInt(val, 10);
      }
    } catch {}
  }
  return stats;
}

async function getLeaderboard(
  gameType: string,
  limit: number = 10
): Promise<Array<{ userId: string; rating: number }>> {
  const r = getRedis();
  if (r) {
    try {
      const results = await r.zrevrange(leaderboardKey(gameType), 0, limit - 1, 'WITHSCORES');
      const entries: Array<{ userId: string; rating: number }> = [];
      for (let i = 0; i < results.length; i += 2) {
        entries.push({ userId: results[i], rating: parseInt(results[i + 1], 10) });
      }
      return entries;
    } catch {}
  }
  return [];
}

export async function createGameRoom(
  gameType: GameType,
  createdBy: string,
  chatJid?: string,
  sessionId?: string,
  settings?: Partial<GameSettings>
): Promise<GameRoom> {
  const roomId = uuidv4().substring(0, 8);
  const defaultSettings = { ...DEFAULT_SETTINGS[gameType] };

  if (gameType === 'chess' && settings?.variant) {
    const tc = TIME_CONTROLS[settings.variant as ChessVariant];
    if (tc) defaultSettings.timeControl = tc;
  }

  const mergedSettings = { ...defaultSettings, ...settings };

  const initialBoard =
    gameType === 'chess'
      ? getInitialFen()
      : gameType === 'tictactoe'
      ? tttInitialBoard()
      : '{}';

  const room: GameRoom = {
    id: roomId,
    type: gameType,
    status: 'waiting',
    settings: mergedSettings,
    player1: null,
    player2: null,
    spectatorIds: [],
    spectatorCount: 0,
    currentTurn: '',
    boardState: initialBoard,
    moves: [],
    chat: [],
    createdAt: Date.now(),
    createdBy,
    chatJid,
    sessionId,
  };

  await saveRoom(room);
  return room;
}

export async function getGameRoom(roomId: string): Promise<GameRoom | null> {
  return getRoom(roomId);
}

export async function getGameStats(userId: string): Promise<Record<string, Record<string, number>>> {
  return getStats(userId);
}

export async function getGameLeaderboard(
  gameType: string,
  limit?: number
): Promise<Array<{ userId: string; rating: number }>> {
  return getLeaderboard(gameType, limit);
}

// Map of socketId -> { roomId, playerId, isSpectator }
const socketToRoom = new Map<string, { roomId: string; playerId: string; isSpectator: boolean }>();
// Map of roomId -> timer interval
const timerIntervals = new Map<string, NodeJS.Timeout>();

// Bot update callback
let botUpdateCallback:
  | ((room: GameRoom, event: string, data: Record<string, string>) => void)
  | null = null;

export function setBotUpdateCallback(
  cb: (room: GameRoom, event: string, data: Record<string, string>) => void
): void {
  botUpdateCallback = cb;
}

function notifyBot(room: GameRoom, event: string, data: Record<string, string> = {}): void {
  if (botUpdateCallback && room.chatJid && room.sessionId) {
    botUpdateCallback(room, event, data);
  }
}

function getInitialBoardForType(gameType: GameType): string {
  switch (gameType) {
    case 'chess':
      return getInitialFen();
    case 'tictactoe':
      return tttInitialBoard();
    default:
      return '{}';
  }
}

export function initGameServer(httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/api/game/socket',
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`[GAME] Socket connected: ${socket.id}`);

    socket.on('joinRoom', async (roomId, playerInfo) => {
      const room = await getRoom(roomId);
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      const playerId = playerInfo.playerId || uuidv4().substring(0, 8);

      // Check if this player is already in the room (reconnection)
      const isReconnectP1 = room.player1 && room.player1.id === playerId;
      const isReconnectP2 = room.player2 && room.player2.id === playerId;

      if (isReconnectP1 || isReconnectP2) {
        const player = isReconnectP1 ? room.player1! : room.player2!;
        player.connected = true;
        player.displayName = playerInfo.displayName || player.displayName;
        player.avatar = playerInfo.avatar || player.avatar;
        socketToRoom.set(socket.id, { roomId, playerId, isSpectator: false });
        socket.join(roomId);
        await saveRoom(room);
        socket.emit('reconnected', room);
        socket.to(roomId).emit('roomUpdate', room);
        return;
      }

      // New player joining
      if (room.status === 'finished' || room.status === 'abandoned') {
        socket.emit('error', 'Game has ended');
        return;
      }

      const newPlayer: PlayerInfo = {
        id: playerId,
        displayName: playerInfo.displayName || `Player ${playerId.substring(0, 4)}`,
        avatar: playerInfo.avatar || '/avatars/a1.svg',
        ready: false,
        connected: true,
      };

      if (!room.player1) {
        room.player1 = newPlayer;
      } else if (!room.player2) {
        room.player2 = newPlayer;
        room.status = 'ready';
      } else {
        // Room is full, offer spectator mode
        socket.emit('error', 'Room is full. You can spectate instead.');
        return;
      }

      socketToRoom.set(socket.id, { roomId, playerId, isSpectator: false });
      socket.join(roomId);
      await saveRoom(room);

      io.to(roomId).emit('roomUpdate', room);
      socket.to(roomId).emit('playerJoined', newPlayer);

      if (room.player2) {
        notifyBot(room, 'player_joined', {
          player1: room.player1?.displayName || 'Player 1',
          player2: room.player2.displayName,
        });
      }
    });

    socket.on('spectateRoom', async (roomId) => {
      const room = await getRoom(roomId);
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      const spectatorId = uuidv4().substring(0, 8);
      room.spectatorIds.push(spectatorId);
      room.spectatorCount = room.spectatorIds.length;

      socketToRoom.set(socket.id, { roomId, playerId: spectatorId, isSpectator: true });
      socket.join(roomId);
      socket.join(`${roomId}:spectators`);
      await saveRoom(room);

      // Send room state with spectator delay
      setTimeout(() => {
        socket.emit('roomUpdate', room);
      }, SPECTATOR_DELAY_MS);

      io.to(roomId).emit('spectatorUpdate', room.spectatorCount);
    });

    socket.on('setReady', async (roomId, ready) => {
      const info = socketToRoom.get(socket.id);
      if (!info || info.isSpectator) return;

      const room = await getRoom(roomId);
      if (!room) return;

      if (room.player1 && room.player1.id === info.playerId) {
        room.player1.ready = ready;
      } else if (room.player2 && room.player2.id === info.playerId) {
        room.player2.ready = ready;
      }

      io.to(roomId).emit('playerReady', info.playerId, ready);

      // Start game if both ready
      if (room.player1?.ready && room.player2?.ready && room.status !== 'playing') {
        room.status = 'playing';
        room.boardState = getInitialBoardForType(room.type);
        room.moves = [];

        if (room.type === 'chess') {
          room.currentTurn = room.player1.id; // white goes first
          if (room.settings.timeControl) {
            room.player1.timeRemaining = room.settings.timeControl;
            room.player2.timeRemaining = room.settings.timeControl;
            startTimer(io, room);
          }
        } else if (room.type === 'tictactoe') {
          room.currentTurn = room.player1.id; // X goes first
        }

        await saveRoom(room);
        io.to(roomId).emit('gameStart', room);

        notifyBot(room, 'game_start', {
          player1: room.player1.displayName,
          player2: room.player2.displayName,
          gameType: room.type,
        });
      } else {
        await saveRoom(room);
        io.to(roomId).emit('roomUpdate', room);
      }
    });

    socket.on('makeMove', async (roomId, moveData) => {
      const info = socketToRoom.get(socket.id);
      if (!info || info.isSpectator) return;

      const room = await getRoom(roomId);
      if (!room || room.status !== 'playing') return;
      if (room.currentTurn !== info.playerId) {
        socket.emit('error', 'Not your turn');
        return;
      }

      const parsed = JSON.parse(moveData);
      let newBoardState: string;
      let notation: string | undefined;
      let captured: string | undefined;
      let isGameOver = false;
      let gameOverReason: string | undefined;

      if (room.type === 'chess') {
        const result = chessMove(room.boardState, parsed.from, parsed.to, parsed.promotion);
        if (!result.valid) {
          socket.emit('error', result.error || 'Invalid move');
          return;
        }
        newBoardState = result.fen;
        notation = result.san;
        captured = result.captured;
        isGameOver = result.isGameOver || false;
        if (result.isCheckmate) gameOverReason = 'checkmate';
        else if (result.isStalemate) gameOverReason = 'stalemate';
        else if (result.isDraw) gameOverReason = 'draw';
      } else if (room.type === 'tictactoe') {
        const symbol = room.currentTurn === room.player1?.id ? 'X' : 'O';
        const result = tttMove(room.boardState, parsed.position, symbol as 'X' | 'O');
        if (!result.valid) {
          socket.emit('error', result.error || 'Invalid move');
          return;
        }
        newBoardState = JSON.stringify(result.board);
        notation = `${symbol} -> ${parsed.position}`;
        isGameOver = result.isGameOver;
        if (result.winner === 'draw') gameOverReason = 'draw';
        else if (result.winner) gameOverReason = 'checkmate'; // using checkmate as "win"
      } else {
        socket.emit('error', 'Unsupported game type');
        return;
      }

      const move: GameMove = {
        moveIndex: room.moves.length,
        playerId: info.playerId,
        moveData,
        notation,
        timestamp: Date.now(),
      };

      room.moves.push(move);
      room.boardState = newBoardState;
      room.drawOffer = undefined;
      room.undoRequest = undefined;

      // Switch turns
      if (!isGameOver) {
        room.currentTurn =
          room.currentTurn === room.player1?.id
            ? room.player2?.id || ''
            : room.player1?.id || '';
      }

      await saveRoom(room);

      // Emit to players immediately
      io.to(roomId).emit('moveMade', move, newBoardState, room);

      // Emit to spectators with delay
      setTimeout(() => {
        io.to(`${roomId}:spectators`).emit('moveMade', move, newBoardState, room);
      }, SPECTATOR_DELAY_MS);

      // Notify bot of captures
      if (captured && room.type === 'chess') {
        const moverName =
          info.playerId === room.player1?.id
            ? room.player1?.displayName
            : room.player2?.displayName;
        const opponentName =
          info.playerId === room.player1?.id
            ? room.player2?.displayName
            : room.player1?.displayName;
        notifyBot(room, 'capture', {
          player: moverName || 'Unknown',
          opponent: opponentName || 'Unknown',
          piece: captured,
          notation: notation || '',
        });
      }

      if (isGameOver) {
        await handleGameOver(io, room, gameOverReason || 'unknown');
      }
    });

    socket.on('sendChat', async (roomId, message, type) => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;

      const room = await getRoom(roomId);
      if (!room) return;

      let senderName = 'Spectator';
      if (!info.isSpectator) {
        if (room.player1?.id === info.playerId) senderName = room.player1.displayName;
        else if (room.player2?.id === info.playerId) senderName = room.player2.displayName;
      }

      const chatMsg: ChatMessage = {
        id: uuidv4().substring(0, 8),
        senderId: info.playerId,
        senderName,
        message,
        type: info.isSpectator ? 'spectator' : type,
        timestamp: Date.now(),
      };

      room.chat.push(chatMsg);
      // Keep only last 100 messages in room
      if (room.chat.length > 100) {
        room.chat = room.chat.slice(-100);
      }
      await saveRoom(room);

      io.to(roomId).emit('chatMessage', chatMsg);
    });

    socket.on('resign', async (roomId) => {
      const info = socketToRoom.get(socket.id);
      if (!info || info.isSpectator) return;

      const room = await getRoom(roomId);
      if (!room || room.status !== 'playing') return;

      room.winner =
        info.playerId === room.player1?.id
          ? room.player2?.id
          : room.player1?.id;

      await handleGameOver(io, room, 'resign');
    });

    socket.on('offerDraw', async (roomId) => {
      const info = socketToRoom.get(socket.id);
      if (!info || info.isSpectator) return;

      const room = await getRoom(roomId);
      if (!room || room.status !== 'playing') return;

      room.drawOffer = info.playerId;
      await saveRoom(room);
      io.to(roomId).emit('drawOffered', info.playerId);
    });

    socket.on('respondDraw', async (roomId, accept) => {
      const info = socketToRoom.get(socket.id);
      if (!info || info.isSpectator) return;

      const room = await getRoom(roomId);
      if (!room || room.status !== 'playing' || !room.drawOffer) return;
      if (room.drawOffer === info.playerId) return; // can't accept own draw offer

      if (accept) {
        await handleGameOver(io, room, 'draw');
      } else {
        room.drawOffer = undefined;
        await saveRoom(room);
        io.to(roomId).emit('drawDeclined', info.playerId);
      }
    });

    socket.on('requestUndo', async (roomId) => {
      const info = socketToRoom.get(socket.id);
      if (!info || info.isSpectator) return;

      const room = await getRoom(roomId);
      if (!room || room.status !== 'playing' || room.moves.length === 0) return;

      room.undoRequest = info.playerId;
      await saveRoom(room);
      io.to(roomId).emit('undoRequested', info.playerId);
    });

    socket.on('respondUndo', async (roomId, accept) => {
      const info = socketToRoom.get(socket.id);
      if (!info || info.isSpectator) return;

      const room = await getRoom(roomId);
      if (!room || room.status !== 'playing' || !room.undoRequest) return;
      if (room.undoRequest === info.playerId) return;

      if (accept && room.moves.length > 0) {
        room.moves.pop();
        // Rebuild board state from moves
        room.boardState = getInitialBoardForType(room.type);

        if (room.type === 'chess') {
          const { Chess } = require('chess.js');
          const chess = new Chess();
          for (const m of room.moves) {
            const pd = JSON.parse(m.moveData);
            chess.move({ from: pd.from, to: pd.to, promotion: pd.promotion });
          }
          room.boardState = chess.fen();
          room.currentTurn =
            chess.turn() === 'w' ? room.player1?.id || '' : room.player2?.id || '';
        } else if (room.type === 'tictactoe') {
          const board = Array(9).fill(null);
          for (let i = 0; i < room.moves.length; i++) {
            const pd = JSON.parse(room.moves[i].moveData);
            board[pd.position] = i % 2 === 0 ? 'X' : 'O';
          }
          room.boardState = JSON.stringify(board);
          room.currentTurn =
            room.moves.length % 2 === 0
              ? room.player1?.id || ''
              : room.player2?.id || '';
        }

        room.undoRequest = undefined;
        await saveRoom(room);
        io.to(roomId).emit('undoAccepted', room.boardState, room.moves);
      } else {
        room.undoRequest = undefined;
        await saveRoom(room);
        io.to(roomId).emit('undoDeclined', info.playerId);
      }
    });

    socket.on('updateSettings', async (roomId, settings) => {
      const info = socketToRoom.get(socket.id);
      if (!info || info.isSpectator) return;

      const room = await getRoom(roomId);
      if (!room || room.status === 'playing' || room.status === 'finished') return;

      room.settings = { ...room.settings, ...settings };

      if (room.type === 'chess' && settings.variant) {
        const tc = TIME_CONTROLS[settings.variant as ChessVariant];
        if (tc) room.settings.timeControl = tc;
      }

      await saveRoom(room);
      io.to(roomId).emit('roomUpdate', room);
    });

    socket.on('disconnect', async () => {
      const info = socketToRoom.get(socket.id);
      if (!info) return;

      const room = await getRoom(info.roomId);
      if (!room) {
        socketToRoom.delete(socket.id);
        return;
      }

      if (info.isSpectator) {
        room.spectatorIds = room.spectatorIds.filter((id) => id !== info.playerId);
        room.spectatorCount = room.spectatorIds.length;
        await saveRoom(room);
        io.to(info.roomId).emit('spectatorUpdate', room.spectatorCount);
      } else {
        // Mark player as disconnected
        if (room.player1?.id === info.playerId) {
          room.player1.connected = false;
        } else if (room.player2?.id === info.playerId) {
          room.player2.connected = false;
        }

        await saveRoom(room);
        io.to(info.roomId).emit('playerLeft', info.playerId);

        // If game is playing and player disconnects, give 60s to reconnect
        if (room.status === 'playing') {
          setTimeout(async () => {
            const currentRoom = await getRoom(info.roomId);
            if (!currentRoom || currentRoom.status !== 'playing') return;

            const player =
              currentRoom.player1?.id === info.playerId
                ? currentRoom.player1
                : currentRoom.player2;

            if (player && !player.connected) {
              // Player didn't reconnect, they lose
              currentRoom.winner =
                info.playerId === currentRoom.player1?.id
                  ? currentRoom.player2?.id
                  : currentRoom.player1?.id;
              await handleGameOver(io, currentRoom, 'abandon');
            }
          }, 60000);
        }
      }

      socketToRoom.delete(socket.id);
    });
  });

  return io;
}

function startTimer(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  room: GameRoom
): void {
  if (timerIntervals.has(room.id)) {
    clearInterval(timerIntervals.get(room.id)!);
  }

  const interval = setInterval(async () => {
    const currentRoom = await getRoom(room.id);
    if (!currentRoom || currentRoom.status !== 'playing') {
      clearInterval(interval);
      timerIntervals.delete(room.id);
      return;
    }

    // Decrement active player's time
    const activePlayer =
      currentRoom.currentTurn === currentRoom.player1?.id
        ? currentRoom.player1
        : currentRoom.player2;

    if (activePlayer && activePlayer.timeRemaining !== undefined) {
      activePlayer.timeRemaining -= 1;

      if (activePlayer.timeRemaining <= 0) {
        activePlayer.timeRemaining = 0;
        currentRoom.winner =
          activePlayer.id === currentRoom.player1?.id
            ? currentRoom.player2?.id
            : currentRoom.player1?.id;
        await saveRoom(currentRoom);
        clearInterval(interval);
        timerIntervals.delete(room.id);
        await handleGameOver(io, currentRoom, 'timeout');
        return;
      }

      await saveRoom(currentRoom);
      io.to(room.id).emit(
        'timerUpdate',
        currentRoom.player1?.timeRemaining || 0,
        currentRoom.player2?.timeRemaining || 0
      );
    }
  }, 1000);

  timerIntervals.set(room.id, interval);
}

async function handleGameOver(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  room: GameRoom,
  reason: string
): Promise<void> {
  room.status = 'finished';
  room.resultType = reason as GameRoom['resultType'];

  // Stop timer
  if (timerIntervals.has(room.id)) {
    clearInterval(timerIntervals.get(room.id)!);
    timerIntervals.delete(room.id);
  }

  // Determine winner for non-draw results
  if (reason === 'checkmate' && !room.winner) {
    // The player who just moved wins
    const lastMove = room.moves[room.moves.length - 1];
    if (lastMove) {
      room.winner = lastMove.playerId;
    }
  }

  // Update ratings
  if (room.player1 && room.player2) {
    const p1Rating = await getRating(room.player1.id, room.type);
    const p2Rating = await getRating(room.player2.id, room.type);
    const isDraw = reason === 'draw' || reason === 'stalemate';

    if (isDraw) {
      const { newWinnerRating, newLoserRating } = calculateElo(p1Rating, p2Rating, true);
      await setRating(room.player1.id, room.type, newWinnerRating);
      await setRating(room.player2.id, room.type, newLoserRating);
      await updateStats(room.player1.id, room.type, 'draw');
      await updateStats(room.player2.id, room.type, 'draw');
    } else if (room.winner) {
      const winnerId = room.winner;
      const loserId =
        winnerId === room.player1.id ? room.player2.id : room.player1.id;
      const winnerRating = winnerId === room.player1.id ? p1Rating : p2Rating;
      const loserRating = winnerId === room.player1.id ? p2Rating : p1Rating;
      const { newWinnerRating, newLoserRating } = calculateElo(winnerRating, loserRating);
      await setRating(winnerId, room.type, newWinnerRating);
      await setRating(loserId, room.type, newLoserRating);
      await updateStats(winnerId, room.type, 'win');
      await updateStats(loserId, room.type, 'loss');
    }
  }

  await saveRoom(room);
  io.to(room.id).emit('gameOver', room);

  // Bot notification
  const winnerName =
    room.winner === room.player1?.id
      ? room.player1?.displayName
      : room.winner === room.player2?.id
      ? room.player2?.displayName
      : null;

  notifyBot(room, 'game_over', {
    winner: winnerName || 'Draw',
    reason,
    player1: room.player1?.displayName || 'Player 1',
    player2: room.player2?.displayName || 'Player 2',
    moves: room.moves.length.toString(),
  });

  // Clean up room after 5 minutes
  setTimeout(async () => {
    await deleteRoom(room.id);
  }, 300000);
}
