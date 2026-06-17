export type TicTacToeCell = 'X' | 'O' | null;
export type TicTacToeBoard = TicTacToeCell[];

export interface TicTacToeMoveResult {
  valid: boolean;
  board: TicTacToeBoard;
  isGameOver: boolean;
  winner?: 'X' | 'O' | 'draw';
  winningLine?: number[];
  error?: string;
}

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

export function createBoard(): TicTacToeBoard {
  return Array(9).fill(null);
}

export function boardToString(board: TicTacToeBoard): string {
  return JSON.stringify(board);
}

export function stringToBoard(s: string): TicTacToeBoard {
  return JSON.parse(s);
}

export function getCurrentTurn(board: TicTacToeBoard): 'X' | 'O' {
  const xCount = board.filter((c) => c === 'X').length;
  const oCount = board.filter((c) => c === 'O').length;
  return xCount <= oCount ? 'X' : 'O';
}

function checkWinner(board: TicTacToeBoard): { winner: 'X' | 'O' | null; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

function isBoardFull(board: TicTacToeBoard): boolean {
  return board.every((cell) => cell !== null);
}

export function validateAndMakeMove(
  boardStr: string,
  position: number,
  player: 'X' | 'O'
): TicTacToeMoveResult {
  const board = stringToBoard(boardStr);

  if (position < 0 || position > 8) {
    return { valid: false, board, isGameOver: false, error: 'Invalid position' };
  }

  if (board[position] !== null) {
    return { valid: false, board, isGameOver: false, error: 'Cell already occupied' };
  }

  const expectedTurn = getCurrentTurn(board);
  if (player !== expectedTurn) {
    return { valid: false, board, isGameOver: false, error: 'Not your turn' };
  }

  board[position] = player;

  const { winner, line } = checkWinner(board);
  if (winner) {
    return {
      valid: true,
      board,
      isGameOver: true,
      winner,
      winningLine: line || undefined,
    };
  }

  if (isBoardFull(board)) {
    return {
      valid: true,
      board,
      isGameOver: true,
      winner: 'draw',
    };
  }

  return { valid: true, board, isGameOver: false };
}

export function isGameOver(boardStr: string): {
  over: boolean;
  winner?: 'X' | 'O' | 'draw';
  winningLine?: number[];
} {
  const board = stringToBoard(boardStr);
  const { winner, line } = checkWinner(board);

  if (winner) {
    return { over: true, winner, winningLine: line || undefined };
  }

  if (isBoardFull(board)) {
    return { over: true, winner: 'draw' };
  }

  return { over: false };
}

export function getInitialBoard(): string {
  return boardToString(createBoard());
}
