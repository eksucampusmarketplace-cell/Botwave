import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getCachedApiSettings, cacheApiSettings, invalidateApiSettings } from '@/lib/redisApiCache';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cached = await getCachedApiSettings(user.id);
    if (cached) return NextResponse.json(cached);

    const { data, error } = await supabase
      .from('user_settings')
      .select('afk_enabled, afk_message, bot_name, skip_probability, welcome_message, command_prefix, timezone, language_preference')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const result = {
      afkEnabled: data?.afk_enabled ?? false,
      afkMessage: data?.afk_message ?? 'I am currently away',
      botName: data?.bot_name ?? 'BotWave',
      skipProbability: Math.max(0, Math.min(1, data?.skip_probability ?? 0.15)),
      welcomeMessage: data?.welcome_message ?? '',
      commandPrefix: data?.command_prefix ?? '!',
      timezone: data?.timezone ?? '',
      languagePreference: data?.language_preference ?? 'en',
    };
    await cacheApiSettings(user.id, result);
    return NextResponse.json(result);
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
    const { afkEnabled, afkMessage, botName, skipProbability, welcomeMessage, commandPrefix, timezone, languagePreference } = body;

    const updateData: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };
    if (afkEnabled !== undefined) updateData.afk_enabled = afkEnabled;
    if (afkMessage !== undefined) updateData.afk_message = afkMessage;
    if (botName !== undefined) updateData.bot_name = botName;
    if (welcomeMessage !== undefined) updateData.welcome_message = welcomeMessage;
    if (commandPrefix !== undefined) updateData.command_prefix = commandPrefix || '!';
    if (timezone !== undefined) updateData.timezone = timezone;
    if (languagePreference !== undefined) updateData.language_preference = languagePreference;
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

    // Two Redis namespaces, two invalidations. Without the bot-side delete,
    // the bot uses the OLD AFK message / bot_name / command_prefix / skip
    // probability for up to SETTINGS_TTL (5 min) after a dashboard save.
    await invalidateApiSettings(user.id);
    // Also invalidate the bot process's in-memory caches via internal endpoint
    // (replaces the less comprehensive invalidateBotRedisKey call)
    try {
      const selfUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SELF_URL || 'http://localhost:3000';
      const intSecret = process.env.INTERNAL_SECRET;
      if (intSecret) {
        fetch(`${selfUrl}/api/internal/cache-invalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-secret': intSecret },
          body: JSON.stringify({ userId: user.id }),
        }).catch(() => {});
      }
    } catch { /* non-critical */ }
    return NextResponse.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    console.error('Error saving user settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}


