// Chess piece rendering — Unicode pieces with multiple style sets
// Each style maps piece codes to display characters/SVG paths

export type PieceStyle = 'classic' | 'neo' | 'alpha' | 'merida' | 'pixel' | 'emoji' | 'text';

export type PieceCode = 'wK' | 'wQ' | 'wR' | 'wB' | 'wN' | 'wP' | 'bK' | 'bQ' | 'bR' | 'bB' | 'bN' | 'bP';

// Unicode chess pieces
const UNICODE_PIECES: Record<PieceCode, string> = {
  wK: '\u2654', wQ: '\u2655', wR: '\u2656', wB: '\u2657', wN: '\u2658', wP: '\u2659',
  bK: '\u265A', bQ: '\u265B', bR: '\u265C', bB: '\u265D', bN: '\u265E', bP: '\u265F',
};

// Emoji-style pieces
const EMOJI_PIECES: Record<PieceCode, string> = {
  wK: '\u{1F451}', wQ: '\u{1F478}', wR: '\u{1F3F0}', wB: '\u{26EA}', wN: '\u{1F40E}', wP: '\u{1F6E1}',
  bK: '\u{1F480}', bQ: '\u{1F9DB}', bR: '\u{1F5FC}', bB: '\u{1F52E}', bN: '\u{1F984}', bP: '\u{2694}',
};

// Text-style (letter) pieces
const TEXT_PIECES: Record<PieceCode, string> = {
  wK: 'K', wQ: 'Q', wR: 'R', wB: 'B', wN: 'N', wP: 'P',
  bK: 'k', bQ: 'q', bR: 'r', bB: 'b', bN: 'n', bP: 'p',
};

export function getPieceChar(code: PieceCode, style: PieceStyle = 'classic'): string {
  switch (style) {
    case 'emoji':
      return EMOJI_PIECES[code];
    case 'text':
      return TEXT_PIECES[code];
    case 'classic':
    case 'neo':
    case 'alpha':
    case 'merida':
    case 'pixel':
    default:
      return UNICODE_PIECES[code];
  }
}

export function fenToPieceCode(fenChar: string): PieceCode | null {
  const map: Record<string, PieceCode> = {
    K: 'wK', Q: 'wQ', R: 'wR', B: 'wB', N: 'wN', P: 'wP',
    k: 'bK', q: 'bQ', r: 'bR', b: 'bB', n: 'bN', p: 'bP',
  };
  return map[fenChar] || null;
}

export function getPieceName(fenChar: string): string {
  const names: Record<string, string> = {
    K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn',
    k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn',
  };
  return names[fenChar] || 'Piece';
}

// Piece size multipliers for different styles
export function getPieceSizeMultiplier(style: PieceStyle): number {
  switch (style) {
    case 'emoji': return 0.65;
    case 'text': return 0.55;
    case 'pixel': return 0.8;
    default: return 0.85;
  }
}

// CSS classes for piece styling per style
export function getPieceClasses(code: PieceCode, style: PieceStyle): string {
  const isWhite = code.startsWith('w');
  const base = 'select-none transition-transform duration-75';

  switch (style) {
    case 'neo':
      return `${base} ${isWhite ? 'drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]' : 'drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)]'}`;
    case 'alpha':
      return `${base} font-bold ${isWhite ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-gray-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)]'}`;
    case 'pixel':
      return `${base} font-mono`;
    case 'emoji':
      return `${base}`;
    case 'text':
      return `${base} font-bold ${isWhite ? 'text-amber-100' : 'text-gray-800'}`;
    case 'merida':
      return `${base} ${isWhite ? 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]' : 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]'}`;
    case 'classic':
    default:
      return `${base} ${isWhite ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]' : ''}`;
  }
}

// Available piece styles with display names
export const PIECE_STYLES: { id: PieceStyle; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic', description: 'Traditional chess pieces' },
  { id: 'neo', name: 'Neo', description: 'Modern with shadows' },
  { id: 'alpha', name: 'Alpha', description: 'Bold contrast pieces' },
  { id: 'merida', name: 'Merida', description: 'Elegant tournament style' },
  { id: 'pixel', name: 'Pixel', description: 'Retro pixel art' },
  { id: 'emoji', name: 'Emoji', description: 'Fun emoji pieces' },
  { id: 'text', name: 'Text', description: 'Minimal letter pieces' },
];
