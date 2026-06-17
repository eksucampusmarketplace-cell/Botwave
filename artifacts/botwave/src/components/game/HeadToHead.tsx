

import React, { useState, useEffect } from 'react';

interface H2HData {
  player1: { name: string; wins: number; rating: number };
  player2: { name: string; wins: number; rating: number };
  draws: number;
  totalGames: number;
  recentMatches: Array<{
    winner: string;
    date: string;
    moves: number;
    resultType: string;
  }>;
}

interface HeadToHeadProps {
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
}

export default function HeadToHead({ player1Id, player2Id, player1Name, player2Name }: HeadToHeadProps) {
  const [data, setData] = useState<H2HData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchH2H() {
      try {
        const res = await fetch(`/api/game/h2h?p1=${encodeURIComponent(player1Id)}&p2=${encodeURIComponent(player2Id)}`);
        if (res.ok) {
          setData(await res.json());
        } else {
          setData({
            player1: { name: player1Name, wins: 0, rating: 1000 },
            player2: { name: player2Name, wins: 0, rating: 1000 },
            draws: 0,
            totalGames: 0,
            recentMatches: [],
          });
        }
      } catch {
        setData({
          player1: { name: player1Name, wins: 0, rating: 1000 },
          player2: { name: player2Name, wins: 0, rating: 1000 },
          draws: 0,
          totalGames: 0,
          recentMatches: [],
        });
      } finally {
        setLoading(false);
      }
    }
    fetchH2H();
  }, [player1Id, player2Id, player1Name, player2Name]);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-1/2 mx-auto mb-3" />
        <div className="h-8 bg-gray-800 rounded mb-2" />
        <div className="h-4 bg-gray-800 rounded w-3/4 mx-auto" />
      </div>
    );
  }

  if (!data || data.totalGames === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Head to Head</h4>
        <p className="text-xs text-gray-600">First encounter - no history yet</p>
      </div>
    );
  }

  const p1Pct = data.totalGames > 0 ? (data.player1.wins / data.totalGames) * 100 : 0;
  const drawPct = data.totalGames > 0 ? (data.draws / data.totalGames) * 100 : 0;
  const p2Pct = data.totalGames > 0 ? (data.player2.wins / data.totalGames) * 100 : 0;

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <h4 className="text-sm font-semibold text-gray-400 mb-3 text-center">Head to Head</h4>

      {/* Score */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-center flex-1">
          <div className="text-2xl font-bold text-green-400">{data.player1.wins}</div>
          <div className="text-xs text-gray-500 truncate">{data.player1.name}</div>
        </div>
        <div className="text-center px-4">
          <div className="text-lg font-bold text-yellow-400">{data.draws}</div>
          <div className="text-xs text-gray-500">Draws</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-2xl font-bold text-blue-400">{data.player2.wins}</div>
          <div className="text-xs text-gray-500 truncate">{data.player2.name}</div>
        </div>
      </div>

      {/* Win rate bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex mb-3">
        {p1Pct > 0 && <div className="bg-green-500 h-full" style={{ width: `${p1Pct}%` }} />}
        {drawPct > 0 && <div className="bg-yellow-500 h-full" style={{ width: `${drawPct}%` }} />}
        {p2Pct > 0 && <div className="bg-blue-500 h-full" style={{ width: `${p2Pct}%` }} />}
      </div>

      {/* Total games */}
      <div className="text-center text-xs text-gray-500 mb-3">{data.totalGames} games played</div>

      {/* Recent matches */}
      {data.recentMatches.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-gray-500 mb-1">Recent</h5>
          <div className="space-y-1">
            {data.recentMatches.slice(0, 5).map((match, i) => (
              <div key={i} className="flex items-center text-xs gap-2">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  match.winner === player1Id ? 'bg-green-500/20 text-green-400' :
                  match.winner === player2Id ? 'bg-blue-500/20 text-blue-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {match.winner === player1Id ? '1' : match.winner === player2Id ? '2' : 'D'}
                </span>
                <span className="text-gray-400 flex-1">{match.resultType}</span>
                <span className="text-gray-600">{match.moves} moves</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
