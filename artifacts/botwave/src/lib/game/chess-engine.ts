// @ts-nocheck
import { Chess } from 'chess.js';

export interface ChessMoveResult {
  valid: boolean;
  san?: string;
  captured?: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isStalemate?: boolean;
  isDraw?: boolean;
  isGameOver?: boolean;
  fen: string;
  error?: string;
}

export function createChessGame(fen?: string): Chess {
  return fen ? new Chess(fen) : new Chess();
}

export function validateAndMakeMove(
  fen: string,
  from: string,
  to: string,
  promotion?: string
): ChessMoveResult {
  const chess = new Chess(fen);

  try {
    const move = chess.move({ from, to, promotion: promotion || undefined });
    if (!move) {
      return { valid: false, fen, error: 'Invalid move' };
    }

    return {
      valid: true,
      san: move.san,
      captured: move.captured || undefined,
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
      isGameOver: chess.isGameOver(),
      fen: chess.fen(),
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid move';
    return { valid: false, fen, error: msg };
  }
}

export function getValidMoves(fen: string, square?: string): string[] {
  const chess = new Chess(fen);
  const moves = chess.moves({ square: square as never, verbose: true });
  return moves.map((m) => `${m.from}${m.to}${m.promotion || ''}`);
}

export function getCurrentTurn(fen: string): 'w' | 'b' {
  const chess = new Chess(fen);
  return chess.turn();
}

export function isInCheck(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.isCheck();
}

export function isGameOver(fen: string): {
  over: boolean;
  reason?: string;
} {
  const chess = new Chess(fen);
  if (!chess.isGameOver()) return { over: false };

  if (chess.isCheckmate()) return { over: true, reason: 'checkmate' };
  if (chess.isStalemate()) return { over: true, reason: 'stalemate' };
  if (chess.isDraw()) return { over: true, reason: 'draw' };
  if (chess.isThreefoldRepetition()) return { over: true, reason: 'repetition' };
  if (chess.isInsufficientMaterial()) return { over: true, reason: 'insufficient' };

  return { over: true, reason: 'unknown' };
}

export function getInitialFen(): string {
  return new Chess().fen();
}

export function undoMove(fen: string, movesHistory: string[]): {
  fen: string;
  removedMove?: string;
} {
  const chess = new Chess();
  // Replay all moves except the last one
  for (let i = 0; i < movesHistory.length - 1; i++) {
    const parts = movesHistory[i];
    const from = parts.substring(0, 2);
    const to = parts.substring(2, 4);
    const promotion = parts.length > 4 ? parts[4] : undefined;
    chess.move({ from, to, promotion });
  }

  return {
    fen: chess.fen(),
    removedMove: movesHistory[movesHistory.length - 1],
  };
}

export function getMoveNotation(fen: string, from: string, to: string, promotion?: string): string {
  const chess = new Chess(fen);
  try {
    const move = chess.move({ from, to, promotion });
    return move?.san || `${from}-${to}`;
  } catch {
    return `${from}-${to}`;
  }
}
