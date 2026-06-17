'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface TournamentPlayer {
  userId: string;
  displayName: string;
  avatar: string;
  rating: number;
  seed: number;
}

interface TournamentMatch {
  id: string;
  round: number;
  matchIndex: number;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner: string | null;
  roomId: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'bye';
}

interface Tournament {
  id: string;
  name: string;
  gameType: string;
  format: 'single_elimination' | 'double_elimination' | 'round_robin';
  maxPlayers: number;
  currentPlayers: number;
  status: 'registration' | 'in_progress' | 'completed';
  createdBy: string;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  rounds: number;
  timeControl: string;
  prize: string;
  createdAt: string;
}

function generateBracketMatches(players: TournamentPlayer[], rounds: number): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  const totalFirstRoundMatches = Math.pow(2, rounds - 1);

  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = Math.pow(2, rounds - round);
    for (let i = 0; i < matchesInRound; i++) {
      const match: TournamentMatch = {
        id: `r${round}-m${i}`,
        round,
        matchIndex: i,
        player1: null,
        player2: null,
        winner: null,
        roomId: null,
        status: round === 1 ? 'pending' : 'pending',
      };

      if (round === 1) {
        const p1Idx = i * 2;
        const p2Idx = i * 2 + 1;
        match.player1 = players[p1Idx] || null;
        match.player2 = players[p2Idx] || null;
        if (match.player1 && !match.player2) {
          match.status = 'bye';
          match.winner = match.player1.userId;
        }
      }

      matches.push(match);
    }
  }

  return matches;
}

export default function TournamentPage() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/tournament?id=${encodeURIComponent(tournamentId)}`);
      if (res.ok) {
        const data = await res.json();
        setTournament(data);
      } else {
        // Generate demo tournament for display
        const demoPlayers: TournamentPlayer[] = Array.from({ length: 8 }, (_, i) => ({
          userId: `player-${i + 1}`,
          displayName: `Player ${i + 1}`,
          avatar: ['🦊', '🐺', '🦁', '🐯', '🦅', '🐉', '🦈', '🐙'][i],
          rating: 1000 + Math.floor(Math.random() * 500),
          seed: i + 1,
        }));
        const rounds = Math.ceil(Math.log2(8));
        setTournament({
          id: tournamentId,
          name: 'Chess Championship',
          gameType: 'chess',
          format: 'single_elimination',
          maxPlayers: 8,
          currentPlayers: 8,
          status: 'in_progress',
          createdBy: 'system',
          players: demoPlayers,
          matches: generateBracketMatches(demoPlayers, rounds),
          rounds,
          timeControl: '10 min',
          prize: 'Bragging Rights',
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { fetchTournament(); }, [fetchTournament]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">{'🏆'}</div>
          <h2 className="text-xl font-bold mb-2">Tournament Not Found</h2>
        </div>
      </div>
    );
  }

  const matchesByRound: Record<number, TournamentMatch[]> = {};
  tournament.matches.forEach((m) => {
    if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
    matchesByRound[m.round].push(m);
  });

  const roundNames = (round: number, total: number): string => {
    if (round === total) return 'Final';
    if (round === total - 1) return 'Semi-Final';
    if (round === total - 2) return 'Quarter-Final';
    return `Round ${round}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{'🏆'}</div>
            <div>
              <h1 className="text-2xl font-bold">{tournament.name}</h1>
              <p className="text-gray-400 text-sm">
                {tournament.gameType === 'chess' ? '♟ Chess' : '⭕ Tic-Tac-Toe'} &middot;{' '}
                {tournament.format.replace('_', ' ')} &middot;{' '}
                {tournament.currentPlayers}/{tournament.maxPlayers} players &middot;{' '}
                {tournament.timeControl}
              </p>
            </div>
            <div className="ml-auto">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                tournament.status === 'registration' ? 'bg-green-500/20 text-green-400' :
                tournament.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {tournament.status === 'registration' ? 'Registration Open' :
                 tournament.status === 'in_progress' ? 'In Progress' : 'Completed'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bracket */}
      <div className="max-w-7xl mx-auto px-4 py-8 overflow-x-auto">
        <div className="flex gap-8 min-w-max">
          {Array.from({ length: tournament.rounds }, (_, r) => r + 1).map((round) => {
            const roundMatches = matchesByRound[round] || [];
            const spacing = Math.pow(2, round - 1);

            return (
              <div key={round} className="flex flex-col">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 text-center">
                  {roundNames(round, tournament.rounds)}
                </h3>
                <div className="flex flex-col justify-around flex-1" style={{ gap: `${spacing * 20}px` }}>
                  {roundMatches.map((match) => (
                    <div
                      key={match.id}
                      className={`bg-gray-900 rounded-lg border ${
                        match.status === 'in_progress' ? 'border-yellow-500/50' :
                        match.status === 'completed' ? 'border-gray-700' :
                        'border-gray-800'
                      } w-56 overflow-hidden`}
                    >
                      {/* Player 1 */}
                      <div className={`flex items-center gap-2 px-3 py-2 ${
                        match.winner === match.player1?.userId ? 'bg-green-500/10' : ''
                      } border-b border-gray-800`}>
                        <span className="text-sm">{match.player1?.avatar || '?'}</span>
                        <span className={`text-sm flex-1 truncate ${
                          match.winner === match.player1?.userId ? 'font-bold text-green-400' : 'text-gray-300'
                        }`}>
                          {match.player1?.displayName || 'TBD'}
                        </span>
                        <span className="text-xs text-gray-500">{match.player1?.rating || ''}</span>
                        {match.winner === match.player1?.userId && (
                          <span className="text-xs text-green-400">{'✓'}</span>
                        )}
                      </div>
                      {/* Player 2 */}
                      <div className={`flex items-center gap-2 px-3 py-2 ${
                        match.winner === match.player2?.userId ? 'bg-green-500/10' : ''
                      }`}>
                        <span className="text-sm">{match.player2?.avatar || '?'}</span>
                        <span className={`text-sm flex-1 truncate ${
                          match.winner === match.player2?.userId ? 'font-bold text-green-400' : 'text-gray-300'
                        }`}>
                          {match.player2?.displayName || match.status === 'bye' ? 'BYE' : 'TBD'}
                        </span>
                        <span className="text-xs text-gray-500">{match.player2?.rating || ''}</span>
                        {match.winner === match.player2?.userId && (
                          <span className="text-xs text-green-400">{'✓'}</span>
                        )}
                      </div>
                      {/* Match status */}
                      {match.status === 'in_progress' && match.roomId && (
                        <a
                          href={`/spectate/${match.roomId}`}
                          className="block text-center py-1 bg-yellow-500/10 text-yellow-400 text-xs hover:bg-yellow-500/20"
                        >
                          Watch Live
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Players list */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <h3 className="text-lg font-semibold mb-4">Players ({tournament.currentPlayers})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tournament.players.map((player) => (
            <div key={player.userId} className="bg-gray-900 rounded-lg p-3 border border-gray-800 flex items-center gap-3">
              <span className="text-2xl">{player.avatar}</span>
              <div>
                <div className="text-sm font-medium">{player.displayName}</div>
                <div className="text-xs text-gray-500">Seed #{player.seed} &middot; {player.rating}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
