import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('groq_api_key, afk_enabled, afk_message, bot_name, skip_probability, welcome_message, command_prefix, timezone')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({
      groqApiKey: data?.groq_api_key ? maskApiKey(data.groq_api_key) : null,
      afkEnabled: data?.afk_enabled ?? false,
      afkMessage: data?.afk_message ?? 'I am currently away',
      botName: data?.bot_name ?? 'BotWave',
      skipProbability: data?.skip_probability ?? 0.15,
      welcomeMessage: data?.welcome_message ?? '',
      commandPrefix: data?.command_prefix ?? '!',
      timezone: data?.timezone ?? '',
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { groqApiKey, afkEnabled, afkMessage, botName, skipProbability, welcomeMessage, commandPrefix, timezone } = body;

    const updateData: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (groqApiKey !== undefined) {
      // Only update if not the masked version
      if (!groqApiKey.includes('****')) {
        updateData.groq_api_key = groqApiKey || null;
      }
    }
    if (afkEnabled !== undefined) updateData.afk_enabled = afkEnabled;
    if (afkMessage !== undefined) updateData.afk_message = afkMessage;
    if (botName !== undefined) updateData.bot_name = botName;
    if (welcomeMessage !== undefined) updateData.welcome_message = welcomeMessage;
    if (commandPrefix !== undefined) updateData.command_prefix = commandPrefix || '!';
    if (timezone !== undefined) updateData.timezone = timezone;
    if (skipProbability !== undefined) {
      const clamped = Math.max(0, Math.min(1, Number(skipProbability) || 0.15));
      updateData.skip_probability = clamped;
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert(updateData, { onConflict: 'user_id' });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    console.error('Error saving user settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}
