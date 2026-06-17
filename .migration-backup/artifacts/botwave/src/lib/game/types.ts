export type GameType = 'chess' | 'tictactoe' | 'checkers' | 'ludo';

export type GameStatus = 'waiting' | 'ready' | 'playing' | 'finished' | 'abandoned';

export type ChessVariant = 'blitz' | 'rapid' | 'classical';
export type TicTacToeVariant = 'standard';

export type GameVariant = ChessVariant | TicTacToeVariant | string;

export interface GameSettings {
  variant: GameVariant;
  timeControl?: number; // seconds per player
  increment?: number; // Fischer increment in seconds per move
  boardTheme: string;
  pieceStyle?: string;
  showCoordinates?: boolean;
  showLegalMoves?: boolean;
  highlightStyle?: 'dots' | 'squares';
  enableAnimations: boolean;
  enableSounds: boolean;
  enablePremoves?: boolean;
}

export const DEFAULT_SETTINGS: Record<GameType, GameSettings> = {
  chess: {
    variant: 'rapid',
    timeControl: 600,
    boardTheme: 'classic',
    enableAnimations: true,
    enableSounds: true,
  },
  tictactoe: {
    variant: 'standard',
    boardTheme: 'classic',
    enableAnimations: true,
    enableSounds: true,
  },
  checkers: {
    variant: 'standard',
    boardTheme: 'classic',
    enableAnimations: true,
    enableSounds: true,
  },
  ludo: {
    variant: 'standard',
    boardTheme: 'classic',
    enableAnimations: true,
    enableSounds: true,
  },
};

export const TIME_CONTROLS: Record<ChessVariant, number> = {
  blitz: 180,
  rapid: 600,
  classical: 1800,
};

export const BOARD_THEMES = [
  { id: 'classic', name: 'Classic Wood', light: '#f0d9b5', dark: '#b58863' },
  { id: 'dark', name: 'Dark Mode', light: '#4a4a4a', dark: '#2d2d2d' },
  { id: 'neon', name: 'Neon', light: '#1a1a2e', dark: '#16213e' },
  { id: 'marble', name: 'Marble', light: '#e8e8e8', dark: '#a0a0a0' },
  { id: 'pixel', name: 'Pixel Art', light: '#8bac0f', dark: '#306230' },
  { id: 'ocean', name: 'Ocean', light: '#dee3e6', dark: '#8ca2ad' },
  { id: 'coral', name: 'Coral', light: '#f0e0d0', dark: '#d08070' },
  { id: 'midnight', name: 'Midnight', light: '#34495e', dark: '#2c3e50' },
  { id: 'forest', name: 'Forest', light: '#e8eddf', dark: '#6b8f71' },
  { id: 'tournament', name: 'Tournament', light: '#eeeed2', dark: '#769656' },
];

export const PRESET_AVATARS = [
  '/avatars/a1.svg', '/avatars/a2.svg', '/avatars/a3.svg', '/avatars/a4.svg',
  '/avatars/a5.svg', '/avatars/a6.svg', '/avatars/a7.svg', '/avatars/a8.svg',
  '/avatars/a9.svg', '/avatars/a10.svg', '/avatars/a11.svg', '/avatars/a12.svg',
  '/avatars/a13.svg', '/avatars/a14.svg', '/avatars/a15.svg', '/avatars/a16.svg',
  '/avatars/a17.svg', '/avatars/a18.svg', '/avatars/a19.svg', '/avatars/a20.svg',
];

export interface PlayerInfo {
  id: string;
  displayName: string;
  avatar: string;
  telegramId?: string;
  ready: boolean;
  connected: boolean;
  timeRemaining?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  type: 'player' | 'spectator' | 'emoji' | 'system';
  timestamp: number;
}

export interface GameMove {
  moveIndex: number;
  playerId: string;
  moveData: string; // JSON string of move details
  notation?: string; // algebraic notation for chess
  timestamp: number;
}

export interface GameRoom {
  id: string;
  type: GameType;
  status: GameStatus;
  settings: GameSettings;
  player1: PlayerInfo | null;
  player2: PlayerInfo | null;
  spectatorIds: string[];
  spectatorCount: number;
  currentTurn: string; // player id
  boardState: string; // JSON string of board
  moves: GameMove[];
  chat: ChatMessage[];
  createdAt: number;
  createdBy: string; // telegram user id or player id
  chatId?: string; // telegram group/chat id for bot updates
  sessionId?: string; // bot session id for sending updates
  winner?: string;
  resultType?: 'checkmate' | 'resign' | 'timeout' | 'draw' | 'stalemate' | 'abandon';
  drawOffer?: string; // player id offering draw
  undoRequest?: string; // player id requesting undo
}

export const QUICK_CHAT_MESSAGES = [
  'Good move!',
  'Oops!',
  'GG',
  'Rematch?',
  'Nice!',
  'Well played!',
  'Thinking...',
  'Let\'s go!',
];

export const EMOJI_REACTIONS = ['👏', '🔥', '😂', '💀', '😤', '🤔', '👀', '💪'];

// Socket.io event types
export interface ServerToClientEvents {
  roomUpdate: (room: GameRoom) => void;
  gameStart: (room: GameRoom) => void;
  moveMade: (move: GameMove, boardState: string, room: GameRoom) => void;
  chatMessage: (msg: ChatMessage) => void;
  playerJoined: (player: PlayerInfo) => void;
  playerLeft: (playerId: string) => void;
  playerReady: (playerId: string, ready: boolean) => void;
  gameOver: (room: GameRoom) => void;
  timerUpdate: (player1Time: number, player2Time: number) => void;
  drawOffered: (playerId: string) => void;
  drawDeclined: (playerId: string) => void;
  undoRequested: (playerId: string) => void;
  undoDeclined: (playerId: string) => void;
  undoAccepted: (boardState: string, moves: GameMove[]) => void;
  spectatorUpdate: (count: number) => void;
  error: (message: string) => void;
  reconnected: (room: GameRoom) => void;
}

export interface ClientToServerEvents {
  joinRoom: (roomId: string, playerInfo: { displayName: string; avatar: string; playerId?: string }) => void;
  spectateRoom: (roomId: string) => void;
  setReady: (roomId: string, ready: boolean) => void;
  makeMove: (roomId: string, moveData: string) => void;
  sendChat: (roomId: string, message: string, type: 'player' | 'spectator' | 'emoji') => void;
  resign: (roomId: string) => void;
  offerDraw: (roomId: string) => void;
  respondDraw: (roomId: string, accept: boolean) => void;
  requestUndo: (roomId: string) => void;
  respondUndo: (roomId: string, accept: boolean) => void;
  updateSettings: (roomId: string, settings: Partial<GameSettings>) => void;
  disconnect: () => void;
}
