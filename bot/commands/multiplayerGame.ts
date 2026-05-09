import { registerCommand, type MessageContext } from './registry';
import { sendReply } from './helpers';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const REDIS_URL = process.env.REDIS_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

// Lightweight Redis client for bot commands
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  if (!REDIS_URL) return null;
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 500, 2000);
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

const VALID_GAME_TYPES = ['chess', 'tictactoe'] as const;
type GameType = typeof VALID_GAME_TYPES[number];

const GAME_NAMES: Record<string, GameType> = {
  chess: 'chess',
  tictactoe: 'tictactoe',
  ttt: 'tictactoe',
  'tic-tac-toe': 'tictactoe',
};

const GAME_DISPLAY: Record<GameType, string> = {
  chess: 'Chess',
  tictactoe: 'Tic-Tac-Toe',
};

const ROOM_TTL = 1800; // 30 minutes

interface GameRoomData {
  id: string;
  type: GameType;
  status: string;
  createdBy: string;
  chatJid: string;
  sessionId: string;
  createdAt: number;
  settings: Record<string, unknown>;
  player1: { id: string; displayName: string; avatar: string; ready: boolean; connected: boolean } | null;
  player2: { id: string; displayName: string; avatar: string; ready: boolean; connected: boolean } | null;
  spectatorIds: string[];
  spectatorCount: number;
  currentTurn: string;
  boardState: string;
  moves: unknown[];
  chat: unknown[];
}

function roomKey(roomId: string): string {
  return `game:room:${roomId}`;
}

function statsKey(userId: string): string {
  return `game:stats:${userId}`;
}

function leaderboardKey(gameType: string): string {
  return `game:leaderboard:${gameType}`;
}

async function createRoom(
  gameType: GameType,
  createdBy: string,
  chatJid: string,
  sessionId: string
): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;

  const roomId = uuidv4().substring(0, 8);
  const initialBoard = gameType === 'chess'
    ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    : JSON.stringify(Array(9).fill(null));

  const room: GameRoomData = {
    id: roomId,
    type: gameType,
    status: 'waiting',
    createdBy,
    chatJid,
    sessionId,
    createdAt: Date.now(),
    settings: {
      variant: gameType === 'chess' ? 'rapid' : 'standard',
      timeControl: gameType === 'chess' ? 600 : undefined,
      boardTheme: 'classic',
      enableAnimations: true,
      enableSounds: true,
    },
    player1: null,
    player2: null,
    spectatorIds: [],
    spectatorCount: 0,
    currentTurn: '',
    boardState: initialBoard,
    moves: [],
    chat: [],
  };

  try {
    await r.set(roomKey(roomId), JSON.stringify(room), 'EX', ROOM_TTL);
    return roomId;
  } catch (err) {
    console.error('[GAME-BOT] Failed to create room:', err);
    return null;
  }
}

async function getRoom(roomId: string): Promise<GameRoomData | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const data = await r.get(roomKey(roomId));
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// ─── !game command ──────────────────────────────────────────────────────────

async function handleGameCommand(
  context: MessageContext,
  args: string[],
  sock: any
): Promise<void> {
  const subCommand = args[0]?.toLowerCase();

  if (!subCommand) {
    const response = [
      '*MULTIPLAYER GAMES*',
      '',
      'Available commands:',
      '!game chess — Start a chess match',
      '!game tictactoe — Start Tic-Tac-Toe',
      '!game join <room-id> — Join a game room',
      '!game spectate <room-id> — Watch a live game',
      '!game stats — Your win/loss record',
      '!game leaderboard — Top players',
      '',
      'Games are played in your browser at ' + APP_URL,
    ].join('\n');
    await sendReply(context.chatJid, response, sock, context.rawMessage.key, context.queue);
    return;
  }

  // Sub-commands
  if (subCommand === 'join') {
    await handleJoin(context, args.slice(1), sock);
    return;
  }
  if (subCommand === 'spectate' || subCommand === 'watch') {
    await handleSpectate(context, args.slice(1), sock);
    return;
  }
  if (subCommand === 'stats') {
    await handleStats(context, sock);
    return;
  }
  if (subCommand === 'leaderboard' || subCommand === 'lb') {
    await handleLeaderboard(context, args.slice(1), sock);
    return;
  }

  // Game type
  const gameType = GAME_NAMES[subCommand];
  if (!gameType) {
    await sendReply(
      context.chatJid,
      `Unknown game "${subCommand}". Available: chess, tictactoe`,
      sock,
      context.rawMessage.key,
      context.queue
    );
    return;
  }

  await handleCreate(context, gameType, sock);
}

async function handleCreate(
  context: MessageContext,
  gameType: GameType,
  sock: any
): Promise<void> {
  const roomId = await createRoom(
    gameType,
    context.senderJid,
    context.chatJid,
    context.sessionId || ''
  );

  if (!roomId) {
    await sendReply(
      context.chatJid,
      'Could not create game room. Redis may be unavailable.',
      sock,
      context.rawMessage.key,
      context.queue
    );
    return;
  }

  const playUrl = `${APP_URL}/play/${roomId}`;
  const gameName = GAME_DISPLAY[gameType];
  const playerName = context.pushName || context.senderJid.split('@')[0];

  const response = [
    `*${gameName} Challenge!*`,
    '',
    `${playerName} wants to play ${gameName}!`,
    '',
    `Join the game: ${playUrl}`,
    '',
    `Or type: !game join ${roomId}`,
    '',
    `Spectate: !game spectate ${roomId}`,
    `Room expires in 30 minutes.`,
  ].join('\n');

  await sendReply(context.chatJid, response, sock, context.rawMessage.key, context.queue);
}

async function handleJoin(
  context: MessageContext,
  args: string[],
  sock: any
): Promise<void> {
  const roomId = args[0];
  if (!roomId) {
    await sendReply(
      context.chatJid,
      'Usage: !game join <room-id>',
      sock,
      context.rawMessage.key,
      context.queue
    );
    return;
  }

  const room = await getRoom(roomId);
  if (!room) {
    await sendReply(
      context.chatJid,
      `Room "${roomId}" not found or has expired.`,
      sock,
      context.rawMessage.key,
      context.queue
    );
    return;
  }

  if (room.player1 && room.player2) {
    await sendReply(
      context.chatJid,
      `Room is full! You can spectate: ${APP_URL}/spectate/${roomId}`,
      sock,
      context.rawMessage.key,
      context.queue
    );
    return;
  }

  const playUrl = `${APP_URL}/play/${roomId}`;
  const gameName = GAME_DISPLAY[room.type];

  const response = [
    `*Joining ${gameName} Room*`,
    '',
    `Click to play: ${playUrl}`,
    '',
    `Room: ${roomId}`,
  ].join('\n');

  await sendReply(context.chatJid, response, sock, context.rawMessage.key, context.queue);
}

async function handleSpectate(
  context: MessageContext,
  args: string[],
  sock: any
): Promise<void> {
  const roomId = args[0];
  if (!roomId) {
    await sendReply(
      context.chatJid,
      'Usage: !game spectate <room-id>',
      sock,
      context.rawMessage.key,
      context.queue
    );
    return;
  }

  const room = await getRoom(roomId);
  if (!room) {
    await sendReply(
      context.chatJid,
      `Room "${roomId}" not found or has expired.`,
      sock,
      context.rawMessage.key,
      context.queue
    );
    return;
  }

  const spectateUrl = `${APP_URL}/spectate/${roomId}`;
  const gameName = GAME_DISPLAY[room.type];

  const response = [
    `*Watch ${gameName} Live*`,
    '',
    `${spectateUrl}`,
    '',
    `${room.player1 ? room.player1.displayName : '?'} vs ${room.player2 ? room.player2.displayName : '?'}`,
    `Status: ${room.status}`,
    `Spectators: ${room.spectatorCount}`,
  ].join('\n');

  await sendReply(context.chatJid, response, sock, context.rawMessage.key, context.queue);
}

async function handleStats(
  context: MessageContext,
  sock: any
): Promise<void> {
  const r = getRedis();
  const userId = context.senderJid;
  const playerName = context.pushName || userId.split('@')[0];

  if (!r) {
    await sendReply(
      context.chatJid,
      'Stats unavailable (Redis not connected).',
      sock,
      context.rawMessage.key,
      context.queue
    );
    return;
  }

  try {
    const data = await r.hgetall(statsKey(userId));
    if (!data || Object.keys(data).length === 0) {
      await sendReply(
        context.chatJid,
        `*${playerName}'s Game Stats*\n\nNo games played yet! Start with !game chess`,
        sock,
        context.rawMessage.key,
        context.queue
      );
      return;
    }

    const stats: Record<string, Record<string, number>> = {};
    for (const [key, val] of Object.entries(data)) {
      const [gameType, stat] = key.split(':');
      if (!stats[gameType]) stats[gameType] = {};
      stats[gameType][stat] = parseInt(val, 10);
    }

    let msg = `*${playerName}'s Game Stats*\n\n`;
    for (const [gameType, s] of Object.entries(stats)) {
      const gameName = GAME_DISPLAY[gameType as GameType] || gameType;
      msg += `*${gameName}*\n`;
      msg += `W: ${s.wins || 0} | L: ${s.losses || 0} | D: ${s.draws || 0} | Total: ${s.games || 0}\n\n`;
    }

    await sendReply(context.chatJid, msg.trim(), sock, context.rawMessage.key, context.queue);
  } catch (err) {
    console.error('[GAME-BOT] Stats error:', err);
    await sendReply(
      context.chatJid,
      'Error fetching stats.',
      sock,
      context.rawMessage.key,
      context.queue
    );
  }
}

async function handleLeaderboard(
  context: MessageContext,
  args: string[],
  sock: any
): Promise<void> {
  const r = getRedis();
  const gameType = GAME_NAMES[args[0]?.toLowerCase() || 'chess'] || 'chess';
  const gameName = GAME_DISPLAY[gameType];

  if (!r) {
    await sendReply(
      context.chatJid,
      'Leaderboard unavailable (Redis not connected).',
      sock,
      context.rawMessage.key,
      context.queue
    );
    return;
  }

  try {
    const results = await r.zrevrange(leaderboardKey(gameType), 0, 9, 'WITHSCORES');
    if (results.length === 0) {
      await sendReply(
        context.chatJid,
        `*${gameName} Leaderboard*\n\nNo players ranked yet! Play a game with !game ${gameType}`,
        sock,
        context.rawMessage.key,
        context.queue
      );
      return;
    }

    let msg = `*${gameName} Leaderboard*\n\n`;
    const medals = ['', '', '', '4.', '5.', '6.', '7.', '8.', '9.', '10.'];

    for (let i = 0; i < results.length; i += 2) {
      const userId = results[i];
      const rating = results[i + 1];
      const rank = Math.floor(i / 2);
      const name = userId.includes('@') ? userId.split('@')[0] : userId;
      msg += `${medals[rank] || `${rank + 1}.`} *${name}* — ${rating} ELO\n`;
    }

    await sendReply(context.chatJid, msg.trim(), sock, context.rawMessage.key, context.queue);
  } catch (err) {
    console.error('[GAME-BOT] Leaderboard error:', err);
    await sendReply(
      context.chatJid,
      'Error fetching leaderboard.',
      sock,
      context.rawMessage.key,
      context.queue
    );
  }
}

// ─── Bot update handler (called from game server) ───────────────────────────

// This is imported by the game server to send WhatsApp updates
// Only the session that created the game sends updates (avoids duplicates)
export async function sendGameUpdate(
  sessionId: string,
  chatJid: string,
  message: string,
  sock: any,
  queue?: any
): Promise<void> {
  try {
    await sendReply(chatJid, message, sock, null, queue);
  } catch (err) {
    console.error('[GAME-BOT] Failed to send game update:', err);
  }
}

export function formatGameEvent(event: string, data: Record<string, string>): string {
  switch (event) {
    case 'game_start':
      return `*${data.player1}* vs *${data.player2}* — ${GAME_DISPLAY[data.gameType as GameType] || data.gameType} match started!`;
    case 'capture':
      return `*${data.player}* captured ${data.opponent}'s ${data.piece}! ${data.notation}`;
    case 'game_over': {
      if (data.reason === 'draw' || data.reason === 'stalemate') {
        return `Draw! *${data.player1}* vs *${data.player2}* — ${data.moves} moves played`;
      }
      return `*${data.winner}* wins by ${data.reason}! (${data.moves} moves)`;
    }
    case 'player_joined':
      return `*${data.player2}* joined the game against *${data.player1}*!`;
    default:
      return '';
  }
}

// ─── Register commands ──────────────────────────────────────────────────────

registerCommand({
  name: 'mgame',
  aliases: ['mgame', 'multiplayer'],
  category: 'games',
  description: 'Multiplayer online games (chess, tic-tac-toe) — play in browser!',
  execute: async (context, args, sock) => {
    await handleGameCommand(context, args, sock);
  },
});
