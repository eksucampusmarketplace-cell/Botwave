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
    const { action, sessionId } = body;

    switch (action) {
      case 'start':
        return NextResponse.json({
          success: true,
          message: `Session ${sessionId} start accepted by worker`,
        });

      case 'status':
        return NextResponse.json({
          success: true,
          sessionId,
          status: 'ok',
        });

      case 'disconnect':
        return NextResponse.json({
          success: true,
          message: `Session ${sessionId} disconnect accepted`,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Internal session route error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    sessionId,
    status: 'ok',
  });
}
