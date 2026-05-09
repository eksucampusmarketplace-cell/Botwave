'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface PlayerStats {
  userId: string;
  ratings: Record<string, { elo: number; wins: number; losses: number; draws: number; gamesPlayed: number }>;
  recentGames: Array<{
    roomId: string;
    gameType: string;
    opponent: string;
    result: 'win' | 'loss' | 'draw';
    ratingChange: number;
    moves: number;
    duration: number;
    date: string;
  }>;
  achievements: Array<{ id: string; name: string; description: string; icon: string; unlockedAt: string }>;
  ratingHistory: Array<{ date: string; rating: number; gameType: string }>;
}

const ACHIEVEMENTS = [
  { id: 'first_win', name: 'First Blood', description: 'Win your first game', icon: '🏆' },
  { id: 'ten_wins', name: 'Veteran', description: 'Win 10 games', icon: '⭐' },
  { id: 'fifty_wins', name: 'Master', description: 'Win 50 games', icon: '👑' },
  { id: 'win_streak_5', name: 'On Fire', description: '5 wins in a row', icon: '🔥' },
  { id: 'win_streak_10', name: 'Unstoppable', description: '10 wins in a row', icon: '💎' },
  { id: 'quick_win', name: 'Speed Demon', description: 'Win in under 1 minute', icon: '⚡' },
  { id: 'long_game', name: 'Marathon', description: 'Play a game over 30 minutes', icon: '🏃' },
  { id: 'comeback', name: 'Comeback King', description: 'Win from a losing position', icon: '🔄' },
  { id: 'perfect_ttt', name: 'Perfect Game', description: 'Win tic-tac-toe without opponent scoring', icon: '✨' },
  { id: 'elo_1200', name: 'Rising Star', description: 'Reach 1200 ELO', icon: '📈' },
  { id: 'elo_1500', name: 'Expert', description: 'Reach 1500 ELO', icon: '🎯' },
  { id: 'elo_1800', name: 'Champion', description: 'Reach 1800 ELO', icon: '🏅' },
  { id: 'scholar_mate', name: 'Scholar', description: 'Win with a scholar\'s mate', icon: '📚' },
  { id: 'en_passant', name: 'En Passant', description: 'Capture using en passant', icon: '🎭' },
  { id: 'promotion', name: 'Promotion', description: 'Promote a pawn', icon: '♛' },
  { id: 'castle', name: 'Castle Builder', description: 'Castle in a game', icon: '🏰' },
];

function getRatingTier(elo: number): { name: string; color: string; icon: string } {
  if (elo >= 2000) return { name: 'Grandmaster', color: 'text-red-400', icon: '♚' };
  if (elo >= 1800) return { name: 'Master', color: 'text-purple-400', icon: '♛' };
  if (elo >= 1600) return { name: 'Expert', color: 'text-blue-400', icon: '♜' };
  if (elo >= 1400) return { name: 'Advanced', color: 'text-cyan-400', icon: '♝' };
  if (elo >= 1200) return { name: 'Intermediate', color: 'text-green-400', icon: '♞' };
  if (elo >= 1000) return { name: 'Beginner', color: 'text-yellow-400', icon: '♟' };
  return { name: 'Novice', color: 'text-gray-400', icon: '🔰' };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'achievements'>('overview');
  const [selectedGameType, setSelectedGameType] = useState<string>('chess');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/stats?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentRating = stats?.ratings[selectedGameType]?.elo || 1000;
  const tier = getRatingTier(currentRating);
  const gameStats = stats?.ratings[selectedGameType] || { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 };
  const winRate = gameStats.gamesPlayed > 0 ? ((gameStats.wins / gameStats.gamesPlayed) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-900/30 to-gray-950 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-4xl shadow-lg">
              {tier.icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{userId}</h1>
              <p className={`text-lg font-semibold ${tier.color}`}>{tier.name}</p>
              <p className="text-gray-400 text-sm mt-1">
                {gameStats.gamesPlayed} games played &middot; {winRate}% win rate
              </p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-4xl font-bold text-white">{currentRating}</div>
              <div className="text-sm text-gray-400">ELO Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Game type selector */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        <div className="flex gap-2">
          {['chess', 'tictactoe'].map((gt) => (
            <button
              key={gt}
              onClick={() => setSelectedGameType(gt)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedGameType === gt ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {gt === 'chess' ? '♟ Chess' : gt === 'tictactoe' ? '⭕ Tic-Tac-Toe' : gt}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="flex border-b border-gray-800">
          {(['overview', 'games', 'achievements'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stats cards */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-4">Performance</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-400">{gameStats.wins}</div>
                  <div className="text-xs text-gray-500">Wins</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{gameStats.losses}</div>
                  <div className="text-xs text-gray-500">Losses</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{gameStats.draws}</div>
                  <div className="text-xs text-gray-500">Draws</div>
                </div>
              </div>
              {/* Win rate bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Win Rate</span>
                  <span>{winRate}%</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
                  {gameStats.gamesPlayed > 0 && (
                    <>
                      <div className="bg-green-500 h-full" style={{ width: `${(gameStats.wins / gameStats.gamesPlayed) * 100}%` }} />
                      <div className="bg-yellow-500 h-full" style={{ width: `${(gameStats.draws / gameStats.gamesPlayed) * 100}%` }} />
                      <div className="bg-red-500 h-full" style={{ width: `${(gameStats.losses / gameStats.gamesPlayed) * 100}%` }} />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Rating chart placeholder */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-4">Rating History</h3>
              <div className="h-40 flex items-end gap-1">
                {(stats?.ratingHistory || []).slice(-20).map((entry, i) => {
                  const minR = 800;
                  const maxR = 2200;
                  const height = Math.max(5, ((entry.rating - minR) / (maxR - minR)) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-gradient-to-t from-purple-600 to-blue-500 rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${entry.rating} ELO - ${entry.date}`}
                      />
                    </div>
                  );
                })}
                {(!stats?.ratingHistory || stats.ratingHistory.length === 0) && (
                  <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                    No rating history yet
                  </div>
                )}
              </div>
            </div>

            {/* Rating tier progress */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Rating Tiers</h3>
              <div className="flex gap-2">
                {[
                  { name: 'Novice', min: 0, color: 'bg-gray-600' },
                  { name: 'Beginner', min: 1000, color: 'bg-yellow-600' },
                  { name: 'Intermediate', min: 1200, color: 'bg-green-600' },
                  { name: 'Advanced', min: 1400, color: 'bg-cyan-600' },
                  { name: 'Expert', min: 1600, color: 'bg-blue-600' },
                  { name: 'Master', min: 1800, color: 'bg-purple-600' },
                  { name: 'Grandmaster', min: 2000, color: 'bg-red-600' },
                ].map((t) => (
                  <div key={t.name} className="flex-1 text-center">
                    <div className={`h-2 rounded-full ${currentRating >= t.min ? t.color : 'bg-gray-800'} mb-1`} />
                    <span className={`text-[10px] ${currentRating >= t.min ? 'text-white' : 'text-gray-600'}`}>
                      {t.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'games' && (
          <div className="space-y-2">
            {(stats?.recentGames || []).length === 0 && (
              <div className="text-center text-gray-500 py-12">No games played yet</div>
            )}
            {(stats?.recentGames || []).map((game, i) => (
              <div key={i} className="bg-gray-900 rounded-lg p-4 border border-gray-800 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  game.result === 'win' ? 'bg-green-500/20 text-green-400' :
                  game.result === 'loss' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {game.result === 'win' ? 'W' : game.result === 'loss' ? 'L' : 'D'}
                </div>
                <div className="flex-1">
                  <div className="font-medium">vs {game.opponent}</div>
                  <div className="text-xs text-gray-500">
                    {game.gameType} &middot; {game.moves} moves &middot; {formatDuration(game.duration)}
                  </div>
                </div>
                <div className={`font-bold ${game.ratingChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {game.ratingChange > 0 ? '+' : ''}{game.ratingChange}
                </div>
                <div className="text-xs text-gray-500">{game.date}</div>
                <a href={`/review/${game.roomId}`} className="text-purple-400 hover:text-purple-300 text-sm">
                  Review
                </a>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = stats?.achievements?.find((a) => a.id === achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={`rounded-xl p-4 border ${
                    unlocked
                      ? 'bg-gray-900 border-purple-500/50'
                      : 'bg-gray-900/50 border-gray-800 opacity-50'
                  }`}
                >
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <div className="font-semibold text-sm">{achievement.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{achievement.description}</div>
                  {unlocked && (
                    <div className="text-[10px] text-purple-400 mt-2">Unlocked {unlocked.unlockedAt}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
