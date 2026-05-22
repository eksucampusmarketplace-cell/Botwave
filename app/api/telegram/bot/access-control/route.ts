/**
 * Bot Access Control API
 *
 * Manages the public/private bot mode, group allowlist/blocklist and
 * user allowlist that decide where a SaaS bot operates and who can use
 * it. All four lists are session-scoped so each bot creator controls
 * their own bot independently.
 *
 * GET    /api/telegram/bot/access-control?sessionId=xxx
 *   → { mode, groupAllowlist, groupBlocklist, userAllowlist }
 *
 * PATCH  /api/telegram/bot/access-control
 *   body: { sessionId, mode: 'public' | 'private' }
 *
 * POST   /api/telegram/bot/access-control
 *   body: { sessionId, list, entryId, label? }
 *     list:    'groupAllowlist' | 'groupBlocklist' | 'userAllowlist'
 *     entryId: chat ID for group lists, user ID for user list (string)
 *     label:   chat title / user display name (optional)
 *
 * DELETE /api/telegram/bot/access-control
 *   body: { sessionId, list, entryId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ListName = 'groupAllowlist' | 'groupBlocklist' | 'userAllowlist';

const LIST_TABLE_MAP: Record<ListName, 'telegram_group_allowlist' | 'telegram_group_blocklist' | 'telegram_user_allowlist'> = {
  groupAllowlist: 'telegram_group_allowlist',
  groupBlocklist: 'telegram_group_blocklist',
  userAllowlist: 'telegram_user_allowlist',
};

async function verifySession(userId: string, sessionId: string) {
  const admin = await createAdminClient();
  const { data } = await admin
    .from('bot_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();
  return !!data;
}

function isValidListName(value: unknown): value is ListName {
  return value === 'groupAllowlist' || value === 'groupBlocklist' || value === 'userAllowlist';
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sessionId = new URL(request.url).searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    if (!(await verifySession(user.id, sessionId))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const admin = await createAdminClient();

    const [config, allowGroups, blockGroups, allowUsers] = await Promise.all([
      admin
        .from('telegram_bot_configs')
        .select('access_mode')
        .eq('session_id', sessionId)
        .maybeSingle(),
      admin
        .from('telegram_group_allowlist')
        .select('chat_id, chat_title, added_by, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false }),
      admin
        .from('telegram_group_blocklist')
        .select('chat_id, chat_title, added_by, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false }),
      admin
        .from('telegram_user_allowlist')
        .select('user_id, user_label, added_by, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false }),
    ]);

    const rawMode = (config.data as { access_mode?: string } | null)?.access_mode;
    const mode = rawMode === 'private' ? 'private' : 'public';

    return NextResponse.json({
      success: true,
      data: {
        mode,
        groupAllowlist: allowGroups.data || [],
        groupBlocklist: blockGroups.data || [],
        userAllowlist: allowUsers.data || [],
      },
    });
  } catch (error) {
    console.error('[ACCESS-CONTROL] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch access control' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, mode } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    if (mode !== 'public' && mode !== 'private') {
      return NextResponse.json({ error: 'mode must be "public" or "private"' }, { status: 400 });
    }
    if (!(await verifySession(user.id, sessionId))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const admin = await createAdminClient();
    const { error } = await admin
      .from('telegram_bot_configs')
      .upsert(
        { session_id: sessionId, access_mode: mode },
        { onConflict: 'session_id' },
      );
    if (error) throw error;

    return NextResponse.json({ success: true, data: { mode } });
  } catch (error) {
    console.error('[ACCESS-CONTROL] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update access mode' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, list, entryId, label } = await request.json();
    if (!sessionId || !entryId || !list) {
      return NextResponse.json({ error: 'sessionId, list and entryId required' }, { status: 400 });
    }
    if (!isValidListName(list)) {
      return NextResponse.json({ error: 'invalid list name' }, { status: 400 });
    }
    if (!(await verifySession(user.id, sessionId))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const table = LIST_TABLE_MAP[list];
    const admin = await createAdminClient();
    const labelField = list === 'userAllowlist' ? 'user_label' : 'chat_title';
    const idField = list === 'userAllowlist' ? 'user_id' : 'chat_id';
    const { data, error } = await admin
      .from(table)
      .upsert(
        {
          session_id: sessionId,
          [idField]: String(entryId),
          [labelField]: label || null,
          added_by: user.id,
        },
        { onConflict: `session_id,${idField}` },
      )
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[ACCESS-CONTROL] POST error:', error);
    return NextResponse.json({ error: 'Failed to add entry' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, list, entryId } = await request.json();
    if (!sessionId || !entryId || !list) {
      return NextResponse.json({ error: 'sessionId, list and entryId required' }, { status: 400 });
    }
    if (!isValidListName(list)) {
      return NextResponse.json({ error: 'invalid list name' }, { status: 400 });
    }
    if (!(await verifySession(user.id, sessionId))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const table = LIST_TABLE_MAP[list];
    const idField = list === 'userAllowlist' ? 'user_id' : 'chat_id';
    const admin = await createAdminClient();
    const { error } = await admin
      .from(table)
      .delete()
      .eq('session_id', sessionId)
      .eq(idField, String(entryId));
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ACCESS-CONTROL] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove entry' }, { status: 500 });
  }
}
