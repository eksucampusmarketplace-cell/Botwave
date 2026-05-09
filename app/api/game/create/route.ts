import { NextRequest, NextResponse } from 'next/server';
import { createGameRoom } from '@/server/gameServer';
import type { GameType, GameSettings } from '@/lib/game/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameType, createdBy, chatJid, sessionId, settings } = body as {
      gameType: GameType;
      createdBy: string;
      chatJid?: string;
      sessionId?: string;
      settings?: Partial<GameSettings>;
    };

    if (!gameType || !createdBy) {
      return NextResponse.json({ error: 'Missing gameType or createdBy' }, { status: 400 });
    }

    const validTypes: GameType[] = ['chess', 'tictactoe', 'checkers', 'ludo'];
    if (!validTypes.includes(gameType)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    const room = await createGameRoom(gameType, createdBy, chatJid, sessionId, settings);

    return NextResponse.json({
      roomId: room.id,
      playUrl: `/play/${room.id}`,
      spectateUrl: `/spectate/${room.id}`,
      room,
    });
  } catch (error) {
    console.error('[API] Error creating game room:', error);
    return NextResponse.json({ error: 'Failed to create game room' }, { status: 500 });
  }
}
