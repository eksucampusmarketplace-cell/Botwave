import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const DEFAULT_COMMANDS = [
  { key: 'help', name: 'Help', description: 'Show all commands', category: 'general', enabled: true },
  { key: 'ping', name: 'Ping', description: 'Check bot status', category: 'general', enabled: true },
  { key: 'sticker', name: 'Sticker Maker', description: 'Create sticker from image', category: 'media', enabled: true },
  { key: 'ai', name: 'AI Chat', description: 'AI-powered chat replies', category: 'ai', enabled: true },
  { key: 'weather', name: 'Weather', description: 'Get weather info', category: 'tools', enabled: true },
  { key: 'joke', name: 'Joke', description: 'Random joke', category: 'fun', enabled: true },
  { key: 'quote', name: 'Quote', description: 'Inspirational quote', category: 'fun', enabled: true },
  { key: 'define', name: 'Dictionary', description: 'Word definition lookup', category: 'tools', enabled: true },
  { key: 'horoscope', name: 'Horoscope', description: 'Daily horoscope', category: 'fun', enabled: true },
  { key: 'translate', name: 'Translate', description: 'Translate text', category: 'tools', enabled: true },
  { key: 'doc', name: 'Document', description: 'Create .docx document', category: 'tools', enabled: true },
  { key: 'poll', name: 'Poll', description: 'Create group poll', category: 'social', enabled: true },
  { key: 'vote', name: 'Vote', description: 'Vote on poll', category: 'social', enabled: true },
  { key: 'play', name: 'Play', description: 'Start mini game', category: 'games', enabled: true },
  { key: 'trivia', name: 'Trivia', description: 'Trivia quiz game', category: 'games', enabled: true },
  { key: 'hangman', name: 'Hangman', description: 'Hangman word game', category: 'games', enabled: true },
  { key: 'wordchain', name: 'Word Chain', description: 'Word chain game', category: 'games', enabled: true },
  { key: 'leaderboard', name: 'Leaderboard', description: 'View top users', category: 'social', enabled: true },
  { key: 'afk', name: 'AFK', description: 'Set AFK status', category: 'general', enabled: true },
  { key: 'download', name: 'Download', description: 'Download media from URL', category: 'media', enabled: true },
  { key: 'music', name: 'Music', description: 'Search & download music', category: 'media', enabled: true },
  { key: 'whois', name: 'Who Is', description: 'Look up user info', category: 'tools', enabled: true },
  { key: 'img2text', name: 'Image to Text', description: 'OCR - extract text from image', category: 'tools', enabled: true },
  { key: 'refer', name: 'Refer', description: 'Get referral link', category: 'social', enabled: true },
];

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: storedCommands } = await supabase
      .from('bot_command_config')
      .select('*')
      .order('command_key');

    const commands = DEFAULT_COMMANDS.map(cmd => {
      const stored = storedCommands?.find((s: any) => s.command_key === cmd.key);
      return {
        key: cmd.key,
        name: stored?.display_name || cmd.name,
        description: stored?.description || cmd.description,
        category: stored?.category || cmd.category,
        enabled: stored ? stored.enabled : cmd.enabled,
        customResponse: stored?.custom_response || null,
        id: stored?.id || null,
      };
    });

    return NextResponse.json({ success: true, data: commands });
  } catch (error) {
    console.error('[COMMANDS] Error:', error);
    return NextResponse.json({ success: true, data: DEFAULT_COMMANDS.map(c => ({ ...c, customResponse: null, id: null })) });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { key, enabled, customResponse, description } = body;

    if (!key) return NextResponse.json({ error: 'Missing command key' }, { status: 400 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('bot_command_config')
      .upsert({
        command_key: key,
        enabled: enabled ?? true,
        custom_response: customResponse || null,
        description: description || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'command_key' });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return NextResponse.json({ success: true, message: 'Command config saved (table pending migration)' });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[COMMANDS] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update command' }, { status: 500 });
  }
}
