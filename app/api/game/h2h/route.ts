import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const p1 = searchParams.get('p1');
  const p2 = searchParams.get('p2');

  if (!p1 || !p2) {
    return NextResponse.json({ error: 'Both p1 and p2 required' }, { status: 400 });
  }

  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        player1: { name: p1, wins: 0, rating: 1000 },
        player2: { name: p2, wins: 0, rating: 1000 },
        draws: 0,
        totalGames: 0,
        recentMatches: [],
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: results } = await supabase
      .from('game_results')
      .select('*')
      .or(`and(player1_id.eq.${p1},player2_id.eq.${p2}),and(player1_id.eq.${p2},player2_id.eq.${p1})`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!results || results.length === 0) {
      return NextResponse.json({
        player1: { name: p1, wins: 0, rating: 1000 },
        player2: { name: p2, wins: 0, rating: 1000 },
        draws: 0,
        totalGames: 0,
        recentMatches: [],
      });
    }

    let p1Wins = 0;
    let p2Wins = 0;
    let draws = 0;

    const recentMatches = results.slice(0, 10).map((r) => {
      if (r.winner_id === p1) p1Wins++;
      else if (r.winner_id === p2) p2Wins++;
      else draws++;

      return {
        winner: r.winner_id || 'draw',
        date: r.created_at,
        moves: r.moves_count || 0,
        resultType: r.result_type || 'unknown',
      };
    });

    // Count remaining results
    results.slice(10).forEach((r) => {
      if (r.winner_id === p1) p1Wins++;
      else if (r.winner_id === p2) p2Wins++;
      else draws++;
    });

    return NextResponse.json({
      player1: { name: p1, wins: p1Wins, rating: 1000 },
      player2: { name: p2, wins: p2Wins, rating: 1000 },
      draws,
      totalGames: results.length,
      recentMatches,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
