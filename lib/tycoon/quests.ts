import type { SupabaseClient } from '@supabase/supabase-js';
import { QUESTS } from './rewards';

export async function addQuestProgress(
  supabase: SupabaseClient,
  playerId: string,
  metric: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;
  const matching = QUESTS.filter((quest) => quest.metric === metric);
  if (matching.length === 0) return;

  for (const quest of matching) {
    await supabase.rpc('increment_tycoon_quest_progress', {
      p_player_id: playerId,
      p_quest_key: quest.key,
      p_amount: amount,
      p_target: quest.target,
    });
  }
}
