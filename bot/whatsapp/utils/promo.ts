/**
 * BotWave Smart Promo System
 *
 * Shows "Create your own bot" promo link every 10th use of a creative command.
 * Only on: sticker, doc, translate, img2text. Never on: joke, weather, ai, ping, afk, games.
 */

import { createClient } from '@supabase/supabase-js';
import { promoMessages } from './responsePools';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type PromoCommand = 'sticker' | 'doc' | 'translate' | 'img2text';

const PROMO_COMMANDS: PromoCommand[] = ['sticker', 'doc', 'translate', 'img2text'];

/**
 * Increment usage count and return whether to show promo.
 */
export async function shouldShowPromo(
  sessionId: string,
  userId: string,
  senderJid: string,
  command: string,
): Promise<boolean> {
  if (!PROMO_COMMANDS.includes(command as PromoCommand)) {
    return false;
  }

  const columnMap: Record<string, string> = {
    sticker: 'sticker_count',
    doc: 'doc_count',
    translate: 'translate_count',
    img2text: 'img2text_count',
  };

  const column = columnMap[command];
  if (!column) return false;

  try {
    // Upsert user_stats row
    const { data: existing } = await supabase
      .from('user_stats')
      .select('*')
      .eq('session_id', sessionId)
      .eq('sender_jid', senderJid)
      .single();

    if (!existing) {
      // Create new entry
      const insertData: Record<string, unknown> = {
        user_id: userId,
        session_id: sessionId,
        sender_jid: senderJid,
        [column]: 1,
        total_commands: 1,
      };
      await supabase.from('user_stats').insert(insertData);
      return false; // First use, no promo
    }

    // Increment
    const newCount = (existing[column] || 0) + 1;
    const updateData: Record<string, unknown> = {
      [column]: newCount,
      total_commands: (existing.total_commands || 0) + 1,
    };
    await supabase
      .from('user_stats')
      .update(updateData)
      .eq('id', existing.id);

    // Show promo every 10th use
    return newCount % 10 === 0;
  } catch (error) {
    console.error('Error checking promo:', error);
    return false;
  }
}

/**
 * Returns a random promo message to append.
 */
export function getPromoMessage(): string {
  return promoMessages[Math.floor(Math.random() * promoMessages.length)];
}
