/**
 * Dunning system for failed payments.
 *
 * When a payment fails (detected via webhook or periodic check), this module:
 * 1. Sends a WhatsApp DM to the user with payment failure notice
 * 2. Schedules retry reminders (Day 1, Day 3, Day 7)
 * 3. On final failure (3 attempts), downgrades to free plan
 *
 * Schedule:
 * - Attempt 1 (Day 0): Immediate "payment failed" notification
 * - Attempt 2 (Day 3): "Retry reminder" with payment link
 * - Attempt 3 (Day 7): "Final warning — downgrade in 24h"
 * - Day 8: Auto-downgrade to free plan
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface DunningConfig {
  maxAttempts: number;
  retryIntervalsDays: number[];
  gracePeriodDays: number;
}

const DEFAULT_CONFIG: DunningConfig = {
  maxAttempts: 3,
  retryIntervalsDays: [0, 3, 7],
  gracePeriodDays: 8,
};

export interface DunningNotification {
  userId: string;
  sessionId: string;
  phoneJid: string;
  message: string;
  notificationType: 'payment_failed' | 'retry_reminder' | 'final_warning' | 'downgraded';
}

/**
 * Record a failed payment and begin dunning sequence.
 */
export async function handlePaymentFailed(
  userId: string,
  paymentId: string,
): Promise<void> {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('dunning_attempts')
    .select('id, attempt_number')
    .eq('user_id', userId)
    .eq('payment_id', paymentId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .single();

  const attemptNumber = existing ? existing.attempt_number + 1 : 1;
  const notificationType = attemptNumber >= DEFAULT_CONFIG.maxAttempts
    ? 'final_warning'
    : attemptNumber === 1
      ? 'payment_failed'
      : 'retry_reminder';

  const nextRetryDays = DEFAULT_CONFIG.retryIntervalsDays[attemptNumber] || null;
  const nextRetryAt = nextRetryDays
    ? new Date(Date.now() + nextRetryDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await supabase.from('dunning_attempts').insert({
    user_id: userId,
    payment_id: paymentId,
    attempt_number: attemptNumber,
    status: 'notified',
    notification_type: notificationType,
    notified_via: 'whatsapp',
    next_retry_at: nextRetryAt,
  });

  await supabase
    .from('subscriptions')
    .update({
      dunning_status: 'active',
      failed_payment_count: attemptNumber,
      last_payment_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Get users who need dunning notifications (pending retries that are due).
 */
export async function getDueRetryNotifications(): Promise<DunningNotification[]> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: dueAttempts } = await supabase
    .from('dunning_attempts')
    .select('user_id, attempt_number, payment_id')
    .eq('status', 'retry_scheduled')
    .lte('next_retry_at', now);

  if (!dueAttempts || dueAttempts.length === 0) return [];

  const notifications: DunningNotification[] = [];

  for (const attempt of dueAttempts) {
    const session = await getActiveSessionForUser(attempt.user_id);
    if (!session) continue;

    const notificationType = attempt.attempt_number >= DEFAULT_CONFIG.maxAttempts
      ? 'final_warning'
      : 'retry_reminder';

    notifications.push({
      userId: attempt.user_id,
      sessionId: session.id,
      phoneJid: `${session.phone_number}@s.whatsapp.net`,
      message: getDunningMessage(notificationType, attempt.attempt_number),
      notificationType,
    });

    await supabase
      .from('dunning_attempts')
      .update({ status: 'notified', updated_at: new Date().toISOString() })
      .eq('user_id', attempt.user_id)
      .eq('payment_id', attempt.payment_id)
      .eq('attempt_number', attempt.attempt_number);
  }

  return notifications;
}

/**
 * Get users past grace period who should be downgraded.
 */
export async function getUsersToDowngrade(): Promise<Array<{ userId: string; sessionId: string; phoneJid: string }>> {
  const supabase = getSupabase();
  const graceCutoff = new Date(Date.now() - DEFAULT_CONFIG.gracePeriodDays * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('dunning_status', 'active')
    .lte('last_payment_attempt_at', graceCutoff)
    .neq('plan', 'free');

  if (!data || data.length === 0) return [];

  const results: Array<{ userId: string; sessionId: string; phoneJid: string }> = [];
  for (const sub of data) {
    const session = await getActiveSessionForUser(sub.user_id);
    if (session) {
      results.push({
        userId: sub.user_id,
        sessionId: session.id,
        phoneJid: `${session.phone_number}@s.whatsapp.net`,
      });
    }
  }
  return results;
}

/**
 * Downgrade a user's plan to free after dunning exhaustion.
 */
export async function downgradeUser(userId: string): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from('subscriptions')
    .update({
      plan: 'free',
      status: 'expired',
      dunning_status: 'downgraded',
      quota_limit: 300,
      quota_used: 0,
      session_limit: 1,
      ai_daily_limit: 10,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  await supabase.from('dunning_attempts').insert({
    user_id: userId,
    attempt_number: DEFAULT_CONFIG.maxAttempts + 1,
    status: 'downgraded',
    notification_type: 'downgraded',
    notified_via: 'whatsapp',
  });
}

/**
 * Mark dunning as resolved (user successfully paid).
 */
export async function resolveDunning(userId: string): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from('subscriptions')
    .update({
      dunning_status: 'resolved',
      failed_payment_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  await supabase
    .from('dunning_attempts')
    .update({ status: 'recovered', resolved_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('status', ['notified', 'retry_scheduled']);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getActiveSessionForUser(userId: string): Promise<{ id: string; phone_number: string } | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('bot_sessions')
    .select('id, phone_number')
    .eq('user_id', userId)
    .eq('state', 'active')
    .limit(1)
    .single();
  return data || null;
}

function getDunningMessage(type: string, attempt: number): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://botwave-tx86.onrender.com';

  switch (type) {
    case 'payment_failed':
      return (
        `⚠️ *Payment Failed*\n\n` +
        `Your subscription payment couldn't be processed. ` +
        `Your plan is still active for now, but please update your payment method.\n\n` +
        `💳 Retry payment: Send *!upgrade* to pay directly here\n` +
        `🌐 Or visit: ${appUrl}/dashboard\n\n` +
        `_If not resolved within 7 days, your plan will be downgraded to Free._`
      );
    case 'retry_reminder':
      return (
        `🔔 *Payment Reminder* (Attempt ${attempt}/3)\n\n` +
        `Your subscription payment is still pending. ` +
        `To keep your current plan features, please complete payment.\n\n` +
        `💳 Pay now: Send *!upgrade* to your bot\n` +
        `🌐 Or visit: ${appUrl}/dashboard\n\n` +
        `_Plan will be downgraded if not resolved soon._`
      );
    case 'final_warning':
      return (
        `🚨 *Final Payment Warning*\n\n` +
        `This is your last reminder. Your subscription payment has failed ${attempt} times. ` +
        `*Your plan will be downgraded to Free tomorrow* if payment isn't completed.\n\n` +
        `💳 Pay now: Send *!upgrade*\n` +
        `🌐 Dashboard: ${appUrl}/dashboard\n\n` +
        `_You'll lose access to premium features including extra sessions, higher quotas, and AI queries._`
      );
    case 'downgraded':
      return (
        `📉 *Plan Downgraded*\n\n` +
        `Your subscription has been downgraded to the Free plan due to payment failure.\n\n` +
        `*What changed:*\n` +
        `• Messages: 300/month\n` +
        `• Sessions: 1\n` +
        `• AI queries: 10/day\n\n` +
        `You can upgrade again anytime with *!upgrade* or from your dashboard.\n` +
        `🌐 ${appUrl}/dashboard`
      );
    default:
      return '⚠️ There was an issue with your subscription payment. Send *!upgrade* to resolve.';
  }
}
