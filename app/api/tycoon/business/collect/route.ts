import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authorizeTycoonRequest } from '@/lib/tycoon/auth';
import { clonePlayer, pendingBusinessCoins } from '@/lib/tycoon/actions';
import { loadAndTickPlayerInMemory, persistTickedPlayer } from '@/lib/tycoon/state';
import { snapshotPlayer } from '@/lib/tycoon/snapshot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  initData?: string;
  session_id?: string;
  business_id?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const businessId = (body.business_id || '').trim();
  if (!businessId) {
    return NextResponse.json({ error: 'business_required' }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const auth = await authorizeTycoonRequest(
    supabase,
    body.initData || '',
    body.session_id || null,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const hostBot = auth.source.kind === 'session' ? auth.source.session_id : null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const loaded = await loadAndTickPlayerInMemory(
      supabase,
      auth.user.telegram_user_id,
      hostBot,
    );
    if (!loaded) {
      return NextResponse.json({ error: 'player_not_found', exists: false }, { status: 404 });
    }

    const player = clonePlayer(loaded.ticked.player);
    const business = player.state.businesses.find((biz) => biz.id === businessId);
    if (!business || business.level <= 0) {
      return NextResponse.json({ error: 'business_not_found' }, { status: 404 });
    }

    const nowMs = Date.now();
    const collected = pendingBusinessCoins(business, nowMs);
    if (collected <= 0) {
      return NextResponse.json({ collected: 0, ...snapshotPlayer(player) }, { status: 200 });
    }

    business.last_collected_at = new Date(nowMs).toISOString();
    player.coins = Number(player.coins) + collected;

    try {
      await persistTickedPlayer(supabase, player, loaded.before.save_version);
      await supabase.from('tycoon_events').insert({
        player_id: player.id,
        kind: 'business_collect',
        payload: { business_id: businessId, coins: collected },
      });
      return NextResponse.json({ collected, ...snapshotPlayer(player) }, { status: 200 });
    } catch (e) {
      if (e instanceof Error && e.message.includes('save_version_conflict') && attempt === 0) {
        continue;
      }
      return NextResponse.json(
        { error: 'save_conflict', detail: e instanceof Error ? e.message : String(e) },
        { status: 409 },
      );
    }
  }

  return NextResponse.json({ error: 'save_conflict' }, { status: 409 });
}
