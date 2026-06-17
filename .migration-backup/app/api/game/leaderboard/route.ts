import { NextRequest, NextResponse } from 'next/server';
import { getGameLeaderboard } from '@/server/gameServer';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gameType = searchParams.get('gameType') || 'chess';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const leaderboard = await getGameLeaderboard(gameType, limit);

    return NextResponse.json({ gameType, leaderboard });
  } catch (error) {
    console.error('[API] Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
