import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'roomId required' }, { status: 400 });
  }

  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: gameResult, error } = await supabase
      .from('game_results')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error || !gameResult) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const review = {
      roomId: gameResult.room_id,
      gameType: gameResult.game_type,
      player1: {
        displayName: gameResult.player1_name || 'Player 1',
        rating: 1000,
      },
      player2: {
        displayName: gameResult.player2_name || 'Player 2',
        rating: 1000,
      },
      result: {
        winner: gameResult.winner_id === gameResult.player1_id
          ? gameResult.player1_name
          : gameResult.winner_id === 'draw'
          ? 'draw'
          : gameResult.player2_name,
        type: gameResult.result_type,
      },
      moves: gameResult.moves_data || [],
      startFen: gameResult.game_type === 'chess'
        ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        : '---------',
      settings: {
        timeControl: gameResult.time_control || 'Untimed',
      },
    };

    return NextResponse.json(review);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
