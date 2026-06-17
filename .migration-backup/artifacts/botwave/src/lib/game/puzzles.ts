export interface ChessPuzzle {
  id: string;
  fen: string;
  moves: string[]; // correct moves in UCI format (e.g., "e2e4")
  rating: number;
  themes: string[];
  title: string;
  description: string;
}

export const CHESS_PUZZLES: ChessPuzzle[] = [
  {
    id: 'p001',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    moves: ['h5f7'],
    rating: 600,
    themes: ['mate', 'short', 'scholars-mate'],
    title: "Scholar's Mate",
    description: 'Find the checkmate in one move.',
  },
  {
    id: 'p002',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 3',
    moves: ['f3f7'],
    rating: 700,
    themes: ['mate', 'short'],
    title: 'Quick Mate',
    description: 'Deliver checkmate in one move.',
  },
  {
    id: 'p003',
    fen: '6k1/5ppp/8/8/8/8/r4PPP/1R4K1 w - - 0 1',
    moves: ['b1b8'],
    rating: 800,
    themes: ['mate', 'backRankMate'],
    title: 'Back Rank Mate',
    description: 'Use the back rank weakness.',
  },
  {
    id: 'p004',
    fen: 'r4rk1/ppp2ppp/2n5/3q4/8/2N2B2/PPP2PPP/R2QR1K1 w - - 0 1',
    moves: ['f3d5'],
    rating: 900,
    themes: ['material', 'fork'],
    title: 'Win the Queen',
    description: 'Capture the undefended queen.',
  },
  {
    id: 'p005',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    moves: ['f3e5'],
    rating: 850,
    themes: ['opening', 'tactic'],
    title: 'Center Fork',
    description: 'Win material with a knight fork.',
  },
  {
    id: 'p006',
    fen: '2r3k1/pp3ppp/8/3Bb3/8/1P6/P4PPP/4R1K1 w - - 0 1',
    moves: ['e1e5'],
    rating: 950,
    themes: ['material', 'capture'],
    title: 'Capture the Bishop',
    description: 'Win the hanging bishop.',
  },
  {
    id: 'p007',
    fen: 'r1b1k2r/ppppqppp/2n2n2/4p1B1/2B1P3/3P1N2/PPP2PPP/RN1QK2R w KQkq - 0 1',
    moves: ['g5f6', 'e7f6'],
    rating: 1000,
    themes: ['opening', 'exchange'],
    title: 'Trade and Develop',
    description: 'Make the best exchange.',
  },
  {
    id: 'p008',
    fen: 'r2qk2r/ppp2ppp/2n1bn2/2bpp3/4P3/1BNP1N2/PPP2PPP/R1BQK2R w KQkq - 0 1',
    moves: ['e4d5', 'e6d5', 'f3e5'],
    rating: 1050,
    themes: ['tactic', 'pawnBreak'],
    title: 'Central Break',
    description: 'Open the center and win material.',
  },
  {
    id: 'p009',
    fen: '6k1/pp3ppp/8/2p5/4r3/1P2R3/P4PPP/6K1 w - - 0 1',
    moves: ['e3e4'],
    rating: 750,
    themes: ['endgame', 'exchange'],
    title: 'Rook Exchange',
    description: 'Simplify to a winning endgame.',
  },
  {
    id: 'p010',
    fen: 'rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3',
    moves: ['g4g5'],
    rating: 650,
    themes: ['defense', 'queenTrap'],
    title: 'Trap the Queen',
    description: 'The queen has no escape squares.',
  },
  {
    id: 'p011',
    fen: 'r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
    moves: ['f3e5'],
    rating: 900,
    themes: ['tactic', 'knightFork'],
    title: 'Knight Fork Threat',
    description: 'The knight eyes multiple targets.',
  },
  {
    id: 'p012',
    fen: '3rk2r/ppp2ppp/2n5/3Np1q1/2B1P1b1/3P4/PPP3PP/R2Q1RK1 w k - 0 1',
    moves: ['d5f6'],
    rating: 1100,
    themes: ['tactic', 'fork', 'check'],
    title: 'Knight Fork with Check',
    description: 'Fork the king and queen.',
  },
  {
    id: 'p013',
    fen: 'r3k2r/ppp1qppp/2n2n2/2bpp1B1/2B1P3/2NP1N2/PPP1QPPP/R3K2R w KQkq - 0 1',
    moves: ['g5f6', 'e7f6', 'e4d5'],
    rating: 1150,
    themes: ['opening', 'pawnCenter'],
    title: 'Win the Center',
    description: 'Exchange and grab central control.',
  },
  {
    id: 'p014',
    fen: '4r1k1/ppp2ppp/8/4N3/8/1P6/P1P2PPP/4R1K1 w - - 0 1',
    moves: ['e5f7'],
    rating: 1000,
    themes: ['tactic', 'fork'],
    title: 'Royal Fork',
    description: 'Fork the rook and pawn structure.',
  },
  {
    id: 'p015',
    fen: 'r1bq1rk1/pppn1ppp/4pn2/3p4/1bPP4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 1',
    moves: ['c4d5', 'e6d5', 'f3e5'],
    rating: 1200,
    themes: ['opening', 'centralControl'],
    title: 'Central Breakthrough',
    description: 'Open lines and dominate the center.',
  },
  {
    id: 'p016',
    fen: '2kr3r/ppp2ppp/2n1b3/8/2B5/2N2N2/PPP2PPP/R3K2R w KQ - 0 1',
    moves: ['c4e6'],
    rating: 950,
    themes: ['tactic', 'bishopAttack'],
    title: 'Bishop Strike',
    description: 'The bishop finds a powerful diagonal.',
  },
  {
    id: 'p017',
    fen: 'r2q1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/R3KB1R w KQ - 0 1',
    moves: ['d4c6'],
    rating: 1050,
    themes: ['tactic', 'knightSacrifice'],
    title: 'Knight Sacrifice',
    description: 'Sacrifice the knight for a strong attack.',
  },
  {
    id: 'p018',
    fen: '1k1r4/pp4pp/2p5/8/3Q4/8/PPP2PPP/2K4R w - - 0 1',
    moves: ['d4d8'],
    rating: 700,
    themes: ['mate', 'backRank'],
    title: 'Queen Checkmate',
    description: 'Deliver a back rank checkmate.',
  },
  {
    id: 'p019',
    fen: 'r4rk1/pppb1ppp/2n1pn2/3p4/3P4/2NBPN2/PPP2PPP/R1B1K2R w KQ - 0 1',
    moves: ['c3e2'],
    rating: 800,
    themes: ['positional', 'knightManeuver'],
    title: 'Knight Reroute',
    description: 'Maneuver the knight to a better square.',
  },
  {
    id: 'p020',
    fen: 'r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P4/2PBPN2/PP1N1PPP/R1BQ1RK1 w - - 0 1',
    moves: ['d3h7'],
    rating: 1300,
    themes: ['tactic', 'bishopSacrifice', 'attack'],
    title: 'Greek Gift Sacrifice',
    description: 'Classic bishop sacrifice on h7.',
  },
];

export function getDailyPuzzle(): ChessPuzzle {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return CHESS_PUZZLES[dayOfYear % CHESS_PUZZLES.length];
}

export function getPuzzleByRating(minRating: number, maxRating: number): ChessPuzzle | null {
  const matching = CHESS_PUZZLES.filter((p) => p.rating >= minRating && p.rating <= maxRating);
  if (matching.length === 0) return null;
  return matching[Math.floor(Math.random() * matching.length)];
}

export function getPuzzleById(id: string): ChessPuzzle | null {
  return CHESS_PUZZLES.find((p) => p.id === id) || null;
}

export function getRandomPuzzle(): ChessPuzzle {
  return CHESS_PUZZLES[Math.floor(Math.random() * CHESS_PUZZLES.length)];
}

export function checkPuzzleMove(puzzle: ChessPuzzle, moveIndex: number, uciMove: string): boolean {
  if (moveIndex >= puzzle.moves.length) return false;
  return puzzle.moves[moveIndex] === uciMove;
}
