import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authorizeTycoonRequest } from '@/lib/tycoon/auth';
import { clonePlayer } from '@/lib/tycoon/actions';
import { QUESTS, grantReward } from '@/lib/tycoon/rewards';
import { loadAndTickPlayerInMemory, persistTickedPlayer } from '@/lib/tycoon/state';
import { snapshotPlayer } from '@/lib/tycoon/snapshot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  initData?: string;
  session_id?: string;
  quest_key?: string;
};

type QuestRow = {
  quest_key: string;
  progress: number;
  completed_at: string | null;
  claimed_at: string | null;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
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
  const loaded = await loadAndTickPlayerInMemory(supabase, auth.user.telegram_user_id, hostBot);
  if (!loaded) {
    return NextResponse.json({ error: 'player_not_found', exists: false }, { status: 404 });
  }

  await ensureQuestRows(supabase, loaded.ticked.player.id);
  if (!body.quest_key) {
    return NextResponse.json({ quests: await questStatus(supabase, loaded.ticked.player.id) });
  }

  const quest = QUESTS.find((q) => q.key === body.quest_key);
  if (!quest) {
    return NextResponse.json({ error: 'quest_not_found' }, { status: 404 });
  }

  const rows = await questStatus(supabase, loaded.ticked.player.id);
  const row = rows.find((item) => item.key === quest.key);
  if (!row || !row.completed) {
    return NextResponse.json({ error: 'quest_incomplete' }, { status: 409 });
  }
  if (row.claimed) {
    return NextResponse.json({ error: 'quest_already_claimed' }, { status: 409 });
  }

  const player = clonePlayer(loaded.ticked.player);
  grantReward(player, quest.reward);

  try {
    await persistTickedPlayer(supabase, player, loaded.before.save_version);
  } catch (e) {
    return NextResponse.json(
      { error: 'save_conflict', detail: e instanceof Error ? e.message : String(e) },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from('tycoon_quest_progress')
    .update({ claimed_at: new Date().toISOString() })
    .eq('player_id', player.id)
    .eq('quest_key', quest.key)
    .is('claimed_at', null);
  if (error) {
    return NextResponse.json({ error: 'quest_claim_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ claimed: true, quest_key: quest.key, reward: quest.reward, ...snapshotPlayer(player) });
}

async function ensureQuestRows(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  playerId: string,
) {
  const rows = QUESTS.map((quest) => ({
    player_id: playerId,
    quest_key: quest.key,
    progress: 0,
  }));
  const { error } = await supabase
    .from('tycoon_quest_progress')
    .upsert(rows, { onConflict: 'player_id,quest_key', ignoreDuplicates: true });
  if (error) {
    throw new Error(`ensureQuestRows failed: ${error.message}`);
  }
}

async function questStatus(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  playerId: string,
) {
  const { data, error } = await supabase
    .from('tycoon_quest_progress')
    .select('quest_key, progress, completed_at, claimed_at')
    .eq('player_id', playerId);
  if (error) {
    throw new Error(`questStatus failed: ${error.message}`);
  }

  const rows = (data ?? []) as QuestRow[];
  return QUESTS.map((quest) => {
    const row = rows.find((item) => item.quest_key === quest.key);
    const progress = Math.min(quest.target, row?.progress ?? 0);
    return {
      ...quest,
      progress,
      completed: !!row?.completed_at || progress >= quest.target,
      claimed: !!row?.claimed_at,
    };
  });
}
