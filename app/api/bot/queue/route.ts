import { NextRequest, NextResponse } from 'next/server';
import { getQueuePosition } from '@/bot/linkQueue';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const position = getQueuePosition(sessionId);
  return NextResponse.json({ success: true, data: position });
}
