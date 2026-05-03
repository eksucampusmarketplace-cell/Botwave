import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-internal-secret');
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, sessionId, ...rest } = body;

    switch (action) {
      case 'create':
        return NextResponse.json({
          success: true,
          message: `Session ${sessionId} creation accepted by worker`,
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
