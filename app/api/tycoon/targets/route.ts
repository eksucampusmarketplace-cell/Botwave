import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authorizeTycoonRequest } from '@/lib/tycoon/auth';
import { NPC_TARGETS } from '@/lib/tycoon/catalog';
import { loadAndTickPlayer } from '@/lib/tycoon/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  initData?: string;
  session_id?: string;
};

export async function GET(req: NextRequest) {
  const initData = req.nextUrl.searchParams.get('initData') || '';
  const sessionId = req.nextUrl.searchParams.get('session_id') || null;

  if (!initData) {
    return NextResponse.json({ targets: decorateTargets() });
  }

  return handleTargets(initData, sessionId);
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  return handleTargets(body.initData || '', body.session_id || null);
}

function decorateTargets(playerLevel?: number) {
  return NPC_TARGETS.map((target) => ({
    ...target,
    locked: playerLevel == null ? false : target.min_level > playerLevel,
  }));
}

async function handleTargets(initData: string, sessionId: string | null) {
  const supabase = await createAdminClient();
  const auth = await authorizeTycoonRequest(
    supabase,
    initData,
    sessionId,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const hostBot = auth.source.kind === 'session' ? auth.source.session_id : null;
  const player = await loadAndTickPlayer(supabase, auth.user.telegram_user_id, hostBot);
  if (!player) {
    return NextResponse.json({ error: 'player_not_found', exists: false }, { status: 404 });
  }

  return NextResponse.json({
    targets: decorateTargets(player.level),
  });
}
