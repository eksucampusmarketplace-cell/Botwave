import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authorizeTycoonRequest } from '@/lib/tycoon/auth';
import { clonePlayer } from '@/lib/tycoon/actions';
import { DAILY_REWARDS, grantReward } from '@/lib/tycoon/rewards';
import { loadAndTickPlayerInMemory, persistTickedPlayer } from '@/lib/tycoon/state';
import { snapshotPlayer } from '@/lib/tycoon/snapshot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  initData?: string;
  session_id?: string;
  claim?: boolean;
};

type ClaimRow = {
  streak: number;
  claimed_at: string;
};

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  let body: Body = {};
  if (req.method === 'POST') {
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }
  } else {
    body = {
      initData: req.nextUrl.searchParams.get('initData') || '',
      session_id: req.nextUrl.searchParams.get('session_id') || undefined,
    };
  }
  const claim = !!body.claim;

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
  const loaded = await loadAndTickPlayerInMemory(supabase, auth.user.telegram_user_id, hostBot);
  if (!loaded) {
    return NextResponse.json({ error: 'player_not_found', exists: false }, { status: 404 });
  }

  const player = clonePlayer(loaded.ticked.player);
  const status = await dailyStatus(supabase, player.id);
  if (!claim) {
    return NextResponse.json({ ...status, rewards: DAILY_REWARDS });
  }

  if (!status.can_claim) {
    return NextResponse.json({ error: 'already_claimed', ...status }, { status: 409 });
  }

  const reward = DAILY_REWARDS[(status.next_streak - 1) % DAILY_REWARDS.length];
  grantReward(player, reward);

  try {
    await persistTickedPlayer(supabase, player, loaded.before.save_version);
  } catch (e) {
    return NextResponse.json(
      { error: 'save_conflict', detail: e instanceof Error ? e.message : String(e) },
      { status: 409 },
    );
  }

  await supabase.from('tycoon_claims').insert({
    player_id: player.id,
    claim_type: 'daily_login',
    streak: status.next_streak,
    reward,
  });

  return NextResponse.json({
    claimed: true,
    streak: status.next_streak,
    reward,
    ...snapshotPlayer(player),
  });
}

async function dailyStatus(supabase: Awaited<ReturnType<typeof createAdminClient>>, playerId: string) {
  const { data, error } = await supabase
    .from('tycoon_claims')
    .select('streak, claimed_at')
    .eq('player_id', playerId)
    .eq('claim_type', 'daily_login')
    .order('claimed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`dailyStatus failed: ${error.message}`);
  }

  const last = data as ClaimRow | null;
  const now = new Date();
  const todayKey = utcDayKey(now);
  const lastKey = last ? utcDayKey(new Date(last.claimed_at)) : null;
  const canClaim = lastKey !== todayKey;
  const yesterdayKey = utcDayKey(new Date(now.getTime() - 86_400_000));
  const nextStreak = !last || lastKey !== yesterdayKey ? 1 : Math.min(7, last.streak + 1);

  return {
    can_claim: canClaim,
    current_streak: last?.streak ?? 0,
    next_streak: canClaim ? nextStreak : last?.streak ?? 1,
    last_claimed_at: last?.claimed_at ?? null,
  };
}

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
