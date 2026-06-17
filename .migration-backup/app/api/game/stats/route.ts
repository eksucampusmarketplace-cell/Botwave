import { NextRequest, NextResponse } from 'next/server';
import { getGameStats } from '@/server/gameServer';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const stats = await getGameStats(userId);

    return NextResponse.json({ userId, stats });
  } catch (error) {
    console.error('[API] Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
