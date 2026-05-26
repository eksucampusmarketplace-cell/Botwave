import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function checkSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-internal-secret');
  return !!process.env.INTERNAL_SECRET && secret === process.env.INTERNAL_SECRET;
}

export async function POST(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    console.log(`[INTERNAL] Invalidating in-memory caches for userId=${userId}`);

    // Invalidate bot process in-memory caches
    // These caches are defined in bot/database.ts and stored as module-level Maps.
    // By calling a dynamic import, we access the same module instance that the bot uses.
    try {
      const botDb = await import('@/bot/database');
      if (typeof botDb.invalidateBotCaches === 'function') {
        await botDb.invalidateBotCaches(userId);
        console.log(`[INTERNAL] Cache invalidation triggered for userId=${userId}`);
      }
    } catch (err) {
      console.error(`[INTERNAL] Failed to invalidate bot caches:`, err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[INTERNAL] Cache-invalidate error:`, err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
