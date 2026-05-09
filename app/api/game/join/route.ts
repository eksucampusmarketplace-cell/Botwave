import { NextRequest, NextResponse } from 'next/server';
import { getGameRoom } from '@/server/gameServer';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    const room = await getGameRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isFull = room.player1 !== null && room.player2 !== null;

    return NextResponse.json({
      room,
      isFull,
      canJoin: !isFull && room.status !== 'finished' && room.status !== 'abandoned',
      canSpectate: true,
    });
  } catch (error) {
    console.error('[API] Error fetching game room:', error);
    return NextResponse.json({ error: 'Failed to fetch game room' }, { status: 500 });
  }
}
