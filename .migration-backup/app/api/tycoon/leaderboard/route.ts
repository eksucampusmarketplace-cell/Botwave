import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const cityId = req.nextUrl.searchParams.get('city_id');
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 50));

  const supabase = await createAdminClient();
  let query = supabase
    .from('tycoon_players')
    .select('id, display_name, city_id, family_id, level, hq_level, power, rep')
    .order('power', { ascending: false })
    .limit(limit);

  if (cityId) {
    const parsed = Number(cityId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return NextResponse.json({ error: 'invalid_city_id' }, { status: 400 });
    }
    query = query.eq('city_id', parsed);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'leaderboard_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({
    rows: (data ?? []).map((row, index) => ({ rank: index + 1, ...row })),
  });
}
