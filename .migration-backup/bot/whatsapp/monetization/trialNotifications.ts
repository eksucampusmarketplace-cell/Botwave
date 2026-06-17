/**
 * Trial expiry and subscription renewal notifications.
 *
 * Sends proactive WhatsApp DMs for:
 * - Trial expiring in 7 days, 3 days, 1 day
 * - Trial expired (downgrade notice)
 * - Quota approaching limit (80%, 100%)
 * - Renewal reminder (3 days before)
 *
 * Notifications are deduplicated per user/type/day to prevent spam.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export type NotificationType =
  | 'trial_expiry_7d'
  | 'trial_expiry_3d'
  | 'trial_expiry_1d'
  | 'trial_expired'
  | 'renewal_reminder'
  | 'quota_80'
  | 'quota_100'
  | 'upgrade_prompt';

export interface SubscriptionNotification {
  userId: string;
  sessionId: string;
  phoneJid: string;
  message: string;
  notificationType: NotificationType;
}

/**
 * Check for users with trials expiring within threshold days.
 */
export async function getTrialExpiryNotifications(): Promise<SubscriptionNotification[]> {
  const supabase = getSupabase();
  const now = new Date();
  const notifications: SubscriptionNotification[] = [];

  const thresholds: Array<{ days: number; type: NotificationType }> = [
    { days: 7, type: 'trial_expiry_7d' },
    { days: 3, type: 'trial_expiry_3d' },
    { days: 1, type: 'trial_expiry_1d' },
  ];

  for (const { days, type } of thresholds) {
    const windowStart = new Date(now.getTime() + (days - 1) * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const { data: expiringSubs } = await supabase
      .from('subscriptions')
      .select('user_id, plan, trial_ends_at')
      .not('trial_ends_at', 'is', null)
      .gte('trial_ends_at', windowStart.toISOString())
      .lt('trial_ends_at', windowEnd.toISOString())
      .neq('plan', 'free');

    if (!expiringSubs || expiringSubs.length === 0) continue;

    for (const sub of expiringSubs) {
      if (await wasAlreadyNotified(sub.user_id, type)) continue;

      const session = await getActiveSessionForUser(sub.user_id);
      if (!session) continue;

      notifications.push({
        userId: sub.user_id,
        sessionId: session.id,
        phoneJid: `${session.phone_number}@s.whatsapp.net`,
        message: getTrialExpiryMessage(type, days, sub.plan),
        notificationType: type,
      });
    }
  }

  return notifications;
}

/**
 * Check for users whose trials have just expired (within last 24h).
 */
export async function getExpiredTrialNotifications(): Promise<SubscriptionNotification[]> {
  const supabase = getSupabase();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const notifications: SubscriptionNotification[] = [];

  const { data: expiredSubs } = await supabase
    .from('subscriptions')
    .select('user_id, plan, trial_ends_at')
    .not('trial_ends_at', 'is', null)
    .gte('trial_ends_at', yesterday.toISOString())
    .lt('trial_ends_at', now.toISOString())
    .neq('plan', 'free');

  if (!expiredSubs || expiredSubs.length === 0) return notifications;

  for (const sub of expiredSubs) {
    if (await wasAlreadyNotified(sub.user_id, 'trial_expired')) continue;

    const session = await getActiveSessionForUser(sub.user_id);
    if (!session) continue;

    notifications.push({
      userId: sub.user_id,
      sessionId: session.id,
      phoneJid: `${session.phone_number}@s.whatsapp.net`,
      message: getTrialExpiredMessage(sub.plan),
      notificationType: 'trial_expired',
    });
  }

  return notifications;
}

/**
 * Check for users approaching their quota limit.
 */
export async function getQuotaNotifications(): Promise<SubscriptionNotification[]> {
  const supabase = getSupabase();
  const notifications: SubscriptionNotification[] = [];

  // 80% quota usage
  const { data: approaching } = await supabase
    .from('subscriptions')
    .select('user_id, plan, quota_used, quota_limit')
    .neq('plan', 'free')
    .gt('quota_limit', 0);

  if (approaching) {
    for (const sub of approaching) {
      if (sub.quota_limit === -1) continue;

      const usage = sub.quota_used / sub.quota_limit;

      if (usage >= 1.0) {
        if (await wasAlreadyNotified(sub.user_id, 'quota_100')) continue;
        const session = await getActiveSessionForUser(sub.user_id);
        if (!session) continue;
        notifications.push({
          userId: sub.user_id,
          sessionId: session.id,
          phoneJid: `${session.phone_number}@s.whatsapp.net`,
          message: getQuotaMessage('quota_100', sub.quota_used, sub.quota_limit, sub.plan),
          notificationType: 'quota_100',
        });
      } else if (usage >= 0.8) {
        if (await wasAlreadyNotified(sub.user_id, 'quota_80')) continue;
        const session = await getActiveSessionForUser(sub.user_id);
        if (!session) continue;
        notifications.push({
          userId: sub.user_id,
          sessionId: session.id,
          phoneJid: `${session.phone_number}@s.whatsapp.net`,
          message: getQuotaMessage('quota_80', sub.quota_used, sub.quota_limit, sub.plan),
          notificationType: 'quota_80',
        });
      }
    }
  }

  return notifications;
}

/**
 * Check for subscriptions renewing within 3 days.
 */
export async function getRenewalReminders(): Promise<SubscriptionNotification[]> {
  const supabase = getSupabase();
  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const notifications: SubscriptionNotification[] = [];

  const { data: renewingSubs } = await supabase
    .from('subscriptions')
    .select('user_id, plan, next_renewal')
    .neq('plan', 'free')
    .gte('next_renewal', now.toISOString())
    .lt('next_renewal', threeDays.toISOString());

  if (!renewingSubs || renewingSubs.length === 0) return notifications;

  for (const sub of renewingSubs) {
    if (await wasAlreadyNotified(sub.user_id, 'renewal_reminder')) continue;

    const session = await getActiveSessionForUser(sub.user_id);
    if (!session) continue;

    const renewalDate = new Date(sub.next_renewal);
    notifications.push({
      userId: sub.user_id,
      sessionId: session.id,
      phoneJid: `${session.phone_number}@s.whatsapp.net`,
      message: getRenewalMessage(sub.plan, renewalDate),
      notificationType: 'renewal_reminder',
    });
  }

  return notifications;
}

/**
 * Record that a notification was sent (dedup).
 */
export async function recordNotification(
  userId: string,
  type: NotificationType,
  sessionId: string,
): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('subscription_notifications').insert({
    user_id: userId,
    notification_type: type,
    sent_via: 'whatsapp',
    session_id: sessionId,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function wasAlreadyNotified(userId: string, type: NotificationType): Promise<boolean> {
  const supabase = getSupabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('subscription_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('notification_type', type)
    .gte('sent_at', today.toISOString());

  return (count || 0) > 0;
}

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

// ─── Message Templates ──────────────────────────────────────────────────────

const PLAN_NAMES: Record<string, string> = {
  lite: 'Lite (coming soon)',
  standard: 'Standard (coming soon)',
  boss: 'Boss (coming soon)',
};

function getTrialExpiryMessage(type: NotificationType, daysLeft: number, plan: string): string {
  const planName = PLAN_NAMES[plan] || plan;
  const dayWord = daysLeft === 1 ? 'day' : 'days';

  return (
    `⏰ *Trial Ending Soon*\n\n` +
    `Your ${planName} trial expires in *${daysLeft} ${dayWord}*.\n\n` +
    `After that you'll be moved to the Free plan (300 msgs/mo, 1 session, 10 AI/day).\n\n` +
    `To keep your current features:\n` +
    `💳 Send *!upgrade ${plan}* to pay directly here\n` +
    `🌐 Or visit your dashboard to subscribe\n\n` +
    `_Current plan features you'll lose: ${getFeatureSummary(plan)}_`
  );
}

function getTrialExpiredMessage(plan: string): string {
  const planName = PLAN_NAMES[plan] || plan;

  return (
    `📋 *Trial Ended*\n\n` +
    `Your ${planName} trial has expired. You're now on the Free plan.\n\n` +
    `*Free plan limits:*\n` +
    `• 300 messages/month\n` +
    `• 1 session\n` +
    `• 10 AI queries/day\n\n` +
    `Ready to continue with premium features?\n` +
    `💳 Send *!upgrade* to see plans and pay directly\n\n` +
    `_Thanks for trying BotWave! Upgrade anytime to get back your features._`
  );
}

function getQuotaMessage(type: NotificationType, used: number, limit: number, plan: string): string {
  const percent = Math.round((used / limit) * 100);

  if (type === 'quota_100') {
    return (
      `🚫 *Quota Reached*\n\n` +
      `You've used all ${limit.toLocaleString()} messages for this month.\n` +
      `Bot commands are paused until your quota resets.\n\n` +
      `*Options:*\n` +
      `• Wait for monthly reset\n` +
      `• Upgrade for more: Send *!upgrade*\n\n` +
      `_Upgrade to get more messages and keep your bot running._`
    );
  }

  return (
    `📊 *Quota Warning* - ${percent}% used\n\n` +
    `You've used ${used.toLocaleString()} of ${limit.toLocaleString()} messages this month.\n\n` +
    `At this rate, you may run out before your reset date.\n` +
    `Consider upgrading for more capacity: Send *!upgrade*\n\n` +
    `_Current plan: ${PLAN_NAMES[plan] || plan}_`
  );
}

function getRenewalMessage(plan: string, renewalDate: Date): string {
  const planName = PLAN_NAMES[plan] || plan;
  const dateStr = renewalDate.toLocaleDateString('en-NG', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    `🔄 *Renewal Reminder*\n\n` +
    `Your ${planName} subscription renews on *${dateStr}*.\n\n` +
    `Make sure your payment method is ready, or send *!upgrade* to manage your plan.\n\n` +
    `_No action needed if you want to continue - renewal is automatic._`
  );
}

function getFeatureSummary(plan: string): string {
  switch (plan) {
    case 'lite':
      return '2,000 msgs/mo, 50 AI/day, auto-reply, custom commands';
    case 'standard':
      return '10,000 msgs/mo, 3 sessions, 200 AI/day, status viewer, flow builder';
    case 'boss':
      return 'Unlimited everything, 5 sessions, API access, custom branding';
    default:
      return 'premium features';
  }
}
