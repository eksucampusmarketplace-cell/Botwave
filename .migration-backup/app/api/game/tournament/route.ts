import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Tournament ID required' }, { status: 400 });
  }

  try {
    if (!redis) {
      return NextResponse.json({ error: 'Redis not configured' }, { status: 503 });
    }

    const data = await redis.get(`game:tournament:${id}`);
    if (!data) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, gameType, format, maxPlayers, timeControl, createdBy } = body;

    if (!name || !gameType || !createdBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!redis) {
      return NextResponse.json({ error: 'Redis not configured' }, { status: 503 });
    }

    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tournament = {
      id,
      name,
      gameType: gameType || 'chess',
      format: format || 'single_elimination',
      maxPlayers: maxPlayers || 8,
      currentPlayers: 0,
      status: 'registration',
      createdBy,
      players: [],
      matches: [],
      rounds: Math.ceil(Math.log2(maxPlayers || 8)),
      timeControl: timeControl || '10 min',
      prize: 'Bragging Rights',
      createdAt: new Date().toISOString(),
    };

    await redis.set(`game:tournament:${id}`, JSON.stringify(tournament), 'EX', 7200);

    return NextResponse.json(tournament, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
