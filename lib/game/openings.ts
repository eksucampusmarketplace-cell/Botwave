// Chess opening book — maps move sequences to opening names
// Format: space-separated SAN moves -> opening name

const OPENINGS: Record<string, string> = {
  // King's Pawn Openings
  'e4': "King's Pawn Opening",
  'e4 e5': "King's Pawn Game",
  'e4 e5 Nf3': "King's Knight Opening",
  'e4 e5 Nf3 Nc6': 'Open Game',
  'e4 e5 Nf3 Nc6 Bb5': 'Ruy Lopez',
  'e4 e5 Nf3 Nc6 Bb5 a6': 'Ruy Lopez: Morphy Defense',
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4': 'Ruy Lopez: Morphy Defense',
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6': 'Ruy Lopez: Morphy Defense',
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O': 'Ruy Lopez: Closed',
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7': 'Ruy Lopez: Closed, Main Line',
  'e4 e5 Nf3 Nc6 Bb5 Nf6': 'Ruy Lopez: Berlin Defense',
  'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4': 'Ruy Lopez: Berlin Defense, Rio Gambit',
  'e4 e5 Nf3 Nc6 Bb5 f5': 'Ruy Lopez: Schliemann Defense',
  'e4 e5 Nf3 Nc6 Bb5 d6': 'Ruy Lopez: Steinitz Defense',
  'e4 e5 Nf3 Nc6 Bc4': 'Italian Game',
  'e4 e5 Nf3 Nc6 Bc4 Bc5': 'Giuoco Piano',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4': 'Evans Gambit',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3': 'Giuoco Piano: Main Line',
  'e4 e5 Nf3 Nc6 Bc4 Nf6': 'Two Knights Defense',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5': 'Two Knights: Fried Liver Attack',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 d4': 'Two Knights Defense: Open Variation',
  'e4 e5 Nf3 Nc6 d4': 'Scotch Game',
  'e4 e5 Nf3 Nc6 d4 exd4': 'Scotch Game',
  'e4 e5 Nf3 Nc6 d4 exd4 Nxd4': 'Scotch Game: Main Line',
  'e4 e5 Nf3 Nc6 d4 exd4 Bc4': 'Scotch Gambit',
  'e4 e5 Nf3 Nc6 Nc3': 'Three Knights Game',
  'e4 e5 Nf3 Nc6 Nc3 Nf6': 'Four Knights Game',
  'e4 e5 Nf3 Nf6': "Petrov's Defense",
  'e4 e5 Nf3 Nf6 Nxe5': "Petrov's Defense: Classical",
  'e4 e5 Nf3 Nf6 d4': "Petrov's Defense: Steinitz Attack",
  'e4 e5 Nf3 d6': 'Philidor Defense',
  'e4 e5 Nf3 f5': 'Latvian Gambit',
  'e4 e5 f4': "King's Gambit",
  'e4 e5 f4 exf4': "King's Gambit Accepted",
  'e4 e5 f4 exf4 Nf3': "King's Gambit Accepted: King's Knight Gambit",
  'e4 e5 f4 Bc5': "King's Gambit Declined: Classical",
  'e4 e5 d4': 'Center Game',
  'e4 e5 Bc4': "Bishop's Opening",
  'e4 e5 Nc3': 'Vienna Game',
  'e4 e5 Nc3 Nf6': 'Vienna Game',
  'e4 e5 Nc3 Nc6 f4': 'Vienna Gambit',

  // Sicilian Defense
  'e4 c5': 'Sicilian Defense',
  'e4 c5 Nf3': 'Sicilian Defense',
  'e4 c5 Nf3 d6': 'Sicilian Defense',
  'e4 c5 Nf3 d6 d4': 'Sicilian Defense: Open',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4': 'Sicilian Defense: Open',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6': 'Sicilian Defense: Open',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3': 'Sicilian Defense: Open',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6': 'Sicilian Najdorf',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6': 'Sicilian Dragon',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e5': 'Sicilian Sveshnikov',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6': 'Sicilian Classical',
  'e4 c5 Nf3 Nc6': 'Sicilian Defense',
  'e4 c5 Nf3 Nc6 d4': 'Sicilian Defense: Open',
  'e4 c5 Nf3 e6': 'Sicilian Defense',
  'e4 c5 Nf3 e6 d4 cxd4 Nxd4': 'Sicilian Defense: Open',
  'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6': 'Sicilian Kan',
  'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6': 'Sicilian Taimanov',
  'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nf6 Nc3 d6': 'Sicilian Scheveningen',
  'e4 c5 Nc3': 'Sicilian Defense: Closed',
  'e4 c5 c3': 'Sicilian Defense: Alapin Variation',
  'e4 c5 d4': 'Sicilian Defense: Smith-Morra Gambit',
  'e4 c5 f4': 'Sicilian Defense: Grand Prix Attack',
  'e4 c5 b4': 'Sicilian Defense: Wing Gambit',

  // French Defense
  'e4 e6': 'French Defense',
  'e4 e6 d4': 'French Defense',
  'e4 e6 d4 d5': 'French Defense',
  'e4 e6 d4 d5 Nc3': 'French Defense: Paulsen Variation',
  'e4 e6 d4 d5 Nc3 Bb4': 'French Winawer',
  'e4 e6 d4 d5 Nc3 Nf6': 'French Classical',
  'e4 e6 d4 d5 Nc3 dxe4': 'French Rubinstein',
  'e4 e6 d4 d5 Nd2': 'French Tarrasch',
  'e4 e6 d4 d5 e5': 'French Advance',
  'e4 e6 d4 d5 exd5': 'French Exchange',

  // Caro-Kann Defense
  'e4 c6': 'Caro-Kann Defense',
  'e4 c6 d4': 'Caro-Kann Defense',
  'e4 c6 d4 d5': 'Caro-Kann Defense',
  'e4 c6 d4 d5 Nc3': 'Caro-Kann: Classical',
  'e4 c6 d4 d5 Nc3 dxe4 Nxe4': 'Caro-Kann: Classical',
  'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5': 'Caro-Kann: Classical Main Line',
  'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7': 'Caro-Kann: Karpov Variation',
  'e4 c6 d4 d5 e5': 'Caro-Kann: Advance',
  'e4 c6 d4 d5 exd5 cxd5': 'Caro-Kann: Exchange',
  'e4 c6 d4 d5 Nd2': 'Caro-Kann: Two Knights',
  'e4 c6 d4 d5 f3': 'Caro-Kann: Fantasy Variation',

  // Scandinavian/Other e4 responses
  'e4 d5': 'Scandinavian Defense',
  'e4 d5 exd5 Qxd5': 'Scandinavian Defense: Main Line',
  'e4 d5 exd5 Nf6': 'Scandinavian Defense: Modern',
  'e4 Nf6': 'Alekhine Defense',
  'e4 d6': 'Pirc Defense',
  'e4 d6 d4 Nf6 Nc3': 'Pirc Defense: Classical',
  'e4 g6': 'Modern Defense',
  'e4 g6 d4 Bg7': 'Modern Defense',
  'e4 b6': "Owen's Defense",
  'e4 Nc6': 'Nimzowitsch Defense',

  // Queen's Pawn Openings
  'd4': "Queen's Pawn Opening",
  'd4 d5': "Queen's Pawn Game",
  'd4 d5 c4': "Queen's Gambit",
  'd4 d5 c4 dxc4': "Queen's Gambit Accepted",
  'd4 d5 c4 e6': "Queen's Gambit Declined",
  'd4 d5 c4 e6 Nc3': "Queen's Gambit Declined",
  'd4 d5 c4 e6 Nc3 Nf6': "Queen's Gambit Declined",
  'd4 d5 c4 e6 Nc3 Nf6 Bg5': "Queen's Gambit Declined: Orthodox",
  'd4 d5 c4 e6 Nc3 Nf6 Nf3': "Queen's Gambit Declined",
  'd4 d5 c4 e6 Nc3 Be7': "Queen's Gambit Declined: Orthodox",
  'd4 d5 c4 c6': 'Slav Defense',
  'd4 d5 c4 c6 Nf3': 'Slav Defense',
  'd4 d5 c4 c6 Nf3 Nf6': 'Slav Defense',
  'd4 d5 c4 c6 Nc3': 'Slav Defense',
  'd4 d5 c4 c6 Nc3 dxc4': 'Slav Defense: Main Line',
  'd4 d5 c4 c6 Nc3 Nf6 Nf3 dxc4': 'Semi-Slav: Meran',
  'd4 d5 c4 c6 Nc3 Nf6 Nf3 e6': 'Semi-Slav Defense',
  'd4 d5 c4 Bf5': 'Baltic Defense',
  'd4 d5 c4 Nc6': 'Chigorin Defense',
  'd4 d5 Nf3': "Queen's Pawn Game",
  'd4 d5 Nf3 Nf6': "Queen's Pawn Game",
  'd4 d5 Bf4': 'London System',
  'd4 d5 Nf3 Nf6 Bf4': 'London System',
  'd4 d5 Nf3 Nf6 e3': 'Colle System',
  'd4 d5 e4': 'Blackmar-Diemer Gambit',

  // Indian Defenses
  'd4 Nf6': 'Indian Defense',
  'd4 Nf6 c4': 'Indian Defense',
  'd4 Nf6 c4 e6': 'Indian Defense',
  'd4 Nf6 c4 e6 Nc3': 'Indian Defense',
  'd4 Nf6 c4 e6 Nc3 Bb4': 'Nimzo-Indian Defense',
  'd4 Nf6 c4 e6 Nc3 Bb4 Qc2': 'Nimzo-Indian: Classical',
  'd4 Nf6 c4 e6 Nc3 Bb4 e3': 'Nimzo-Indian: Rubinstein',
  'd4 Nf6 c4 e6 Nf3': 'Indian Defense',
  'd4 Nf6 c4 e6 Nf3 b6': "Queen's Indian Defense",
  'd4 Nf6 c4 e6 Nf3 Bb4+': 'Bogo-Indian Defense',
  'd4 Nf6 c4 e6 g3': 'Catalan Opening',
  'd4 Nf6 c4 e6 g3 d5': 'Catalan Opening',
  'd4 Nf6 c4 g6': "King's Indian Defense",
  'd4 Nf6 c4 g6 Nc3': "King's Indian Defense",
  'd4 Nf6 c4 g6 Nc3 Bg7': "King's Indian Defense",
  'd4 Nf6 c4 g6 Nc3 Bg7 e4': "King's Indian Defense: Classical",
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6': "King's Indian Defense: Classical",
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3': "King's Indian: Classical Main Line",
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3': "King's Indian: Samisch",
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Bg5': "King's Indian: Averbakh",
  'd4 Nf6 c4 g6 Nc3 d5': 'Grunfeld Defense',
  'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5': 'Grunfeld Defense: Exchange',
  'd4 Nf6 c4 c5': 'Benoni Defense',
  'd4 Nf6 c4 c5 d5': 'Modern Benoni',
  'd4 Nf6 c4 c5 d5 e6': 'Modern Benoni',

  // Flank Openings
  'c4': 'English Opening',
  'c4 e5': 'English Opening: Reversed Sicilian',
  'c4 c5': 'English Opening: Symmetrical',
  'c4 Nf6': 'English Opening: Anglo-Indian',
  'c4 e6': 'English Opening',
  'c4 g6': 'English Opening',
  'Nf3': 'Reti Opening',
  'Nf3 d5': 'Reti Opening',
  'Nf3 d5 c4': 'Reti Opening',
  'Nf3 Nf6': 'Reti Opening',
  'Nf3 Nf6 c4': 'Reti Opening',
  'Nf3 Nf6 g3': "King's Indian Attack",
  'g3': "King's Fianchetto Opening",
  'b3': 'Larsen Opening',
  'b4': 'Sokolsky Opening (Polish)',
  'f4': 'Bird Opening',
  'f4 d5': 'Bird Opening',

  // Dutch Defense
  'd4 f5': 'Dutch Defense',
  'd4 f5 c4': 'Dutch Defense',
  'd4 f5 g3': 'Dutch Defense: Leningrad',
  'd4 f5 Nc3': 'Dutch Defense',

  // Other
  'd4 e6': 'French-like',
  'd4 c5': 'Old Benoni',
  'd4 g6': 'Modern Defense',
  'd4 b6': 'English Defense',
  'd4 d6': 'Old Indian Defense',
};

export function identifyOpening(moves: string[]): string | null {
  // Try longest match first for specificity
  for (let len = moves.length; len > 0; len--) {
    const key = moves.slice(0, len).join(' ');
    if (OPENINGS[key]) {
      return OPENINGS[key];
    }
  }
  return null;
}

export function getOpeningForMoveList(sanMoves: string[]): { name: string; moveCount: number } | null {
  let lastMatch: { name: string; moveCount: number } | null = null;

  for (let i = 1; i <= sanMoves.length; i++) {
    const key = sanMoves.slice(0, i).join(' ');
    if (OPENINGS[key]) {
      lastMatch = { name: OPENINGS[key], moveCount: i };
    }
  }

  return lastMatch;
}
