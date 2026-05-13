import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

async function authenticateApiKey(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.slice(7);
  const keyHash = hashApiKey(apiKey);

  const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) return null;

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

  const { data: keyData } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .single();

  if (!keyData) return null;

  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return null;
  }

  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyData.id);

  return keyData;
}

export async function GET(request: NextRequest) {
  const keyData = await authenticateApiKey(request);
  if (!keyData) {
    return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || (process.env.SUPABASE_INTERNAL_URL || process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

  switch (action) {
    case 'sessions': {
      const { data } = await supabase
        .from('bot_sessions')
        .select('id, session_name, phone_number, state, last_active')
        .eq('user_id', keyData.user_id);
      return NextResponse.json({ success: true, data });
    }
    case 'stats': {
      const { data } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', keyData.user_id)
        .single();
      return NextResponse.json({ success: true, data });
    }
    case 'features': {
      const sessionId = searchParams.get('sessionId');
      let query = supabase
        .from('bot_features')
        .select('*')
        .eq('user_id', keyData.user_id);
      if (sessionId) query = query.eq('session_id', sessionId);
      const { data } = await query;
      return NextResponse.json({ success: true, data });
    }
    default:
      return NextResponse.json({
        success: true,
        message: 'BotWave API',
        endpoints: {
          'GET ?action=sessions': 'List your sessions',
          'GET ?action=stats': 'Get your stats',
          'GET ?action=features&sessionId=...': 'Get feature toggles',
          'POST { action: "send", sessionId, to, message }': 'Send a message (requires write permission)',
          'POST { action: "toggle_feature", sessionId, feature, enabled }': 'Toggle a feature (requires write permission)',
        },
      });
  }
}

export async function POST(request: NextRequest) {
  const keyData = await authenticateApiKey(request);
  if (!keyData) {
    return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 });
  }

  if (!keyData.permissions.includes('write')) {
    return NextResponse.json({ error: 'API key lacks write permission' }, { status: 403 });
  }

  const body = await request.json();
  const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || (process.env.SUPABASE_INTERNAL_URL || process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

  switch (body.action) {
    case 'toggle_feature': {
      const { sessionId, feature, enabled } = body;
      if (!sessionId || !feature || enabled === undefined) {
        return NextResponse.json({ error: 'Missing sessionId, feature, or enabled' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('bot_features')
        .upsert({
          user_id: keyData.user_id,
          session_id: sessionId,
          feature_name: feature,
          enabled,
          config: {},
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,session_id,feature_name' })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }
    case 'schedule_message': {
      const { sessionId, targetJid, message, sendAt } = body;
      if (!sessionId || !targetJid || !message || !sendAt) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('scheduled_messages')
        .insert({
          session_id: sessionId,
          user_jid: keyData.user_id,
          target_jid: targetJid,
          message,
          send_at: sendAt,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }
    default:
      return NextResponse.json({ error: 'Unknown action. Use: toggle_feature, schedule_message' }, { status: 400 });
  }
}
