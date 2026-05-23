/**
 * Monetization notification scheduler.
 *
 * Runs periodically (every 30 minutes) to check for:
 * - Dunning retries that are due
 * - Users past grace period needing downgrade
 * - Trial expiry notifications
 * - Quota warnings
 * - Renewal reminders
 *
 * Sends notifications via the active bot session for each user.
 */

import { createClient } from '@supabase/supabase-js';
import { getActiveBotSocket } from '../../BotManager';
import { delay } from '../../../lib/utils';
import { PLANS } from '../../../lib/squad';
import { invalidateRedisKey } from '../../infrastructure/redisSessionCache';
import { invalidateSubscription as invalidateApiSubscription } from '../../../lib/redisApiCache';
import {
  getDueRetryNotifications,
  getUsersToDowngrade,
  downgradeUser,
  type DunningNotification,
} from './dunning';
import {
  getTrialExpiryNotifications,
  getExpiredTrialNotifications,
  getQuotaNotifications,
  getRenewalReminders,
  recordNotification,
  type SubscriptionNotification,
} from './trialNotifications';
import {
  sendTrialExpiryEmail,
  sendTrialExpiredEmail,
  sendRenewalReminderEmail,
  sendQuotaWarningEmail,
  sendPaymentFailedEmail,
} from '../../../lib/email';

const SCHEDULER_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const NOTIFICATION_DELAY_MS = 3000; // 3s between DMs (anti-ban)

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the monetization notification scheduler.
 * Call once at bot service startup.
 */
export function startMonetizationScheduler(): void {
  if (schedulerInterval) return;

  console.log('[MONETIZATION] Notification scheduler started (interval: 30min)');

  // Run first check after 60s to let sessions connect
  setTimeout(() => {
    void runSchedulerCycle();
  }, 60_000);

  schedulerInterval = setInterval(() => {
    void runSchedulerCycle();
  }, SCHEDULER_INTERVAL_MS);
}

/**
 * Stop the scheduler (for graceful shutdown).
 */
export function stopMonetizationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[MONETIZATION] Notification scheduler stopped');
  }
}

/**
 * Single scheduler cycle - collects and sends all pending notifications.
 */
async function runSchedulerCycle(): Promise<void> {
  try {
    console.log('[MONETIZATION] Running notification cycle...');

    // 0. Proactive plan expiry - downgrade expired subscriptions
    const expiredCount = await downgradeExpiredPlans();
    if (expiredCount > 0) {
      console.log(`[MONETIZATION] Proactively downgraded ${expiredCount} expired subscription(s)`);
    }

    // 1. Process dunning retries
    const dunningNotifs = await getDueRetryNotifications();
    for (const notif of dunningNotifs) {
      await sendNotification(notif);
      await sendEmailForNotification(notif.userId, notif.notificationType, notif);
      await delay(NOTIFICATION_DELAY_MS);
    }

    // 2. Auto-downgrade past-grace users
    const downgrades = await getUsersToDowngrade();
    for (const { userId, sessionId, phoneJid } of downgrades) {
      await downgradeUser(userId);
      await sendNotification({
        userId,
        sessionId,
        phoneJid,
        message: getDowngradeMessage(),
        notificationType: 'downgraded',
      });
      await delay(NOTIFICATION_DELAY_MS);
    }

    // 3. Trial expiry warnings
    const trialNotifs = await getTrialExpiryNotifications();
    for (const notif of trialNotifs) {
      await sendNotification(notif);
      await sendEmailForNotification(notif.userId, notif.notificationType, notif);
      await recordNotification(notif.userId, notif.notificationType, notif.sessionId);
      await delay(NOTIFICATION_DELAY_MS);
    }

    // 4. Expired trials
    const expiredNotifs = await getExpiredTrialNotifications();
    for (const notif of expiredNotifs) {
      await sendNotification(notif);
      await sendEmailForNotification(notif.userId, notif.notificationType, notif);
      await recordNotification(notif.userId, notif.notificationType, notif.sessionId);
      await delay(NOTIFICATION_DELAY_MS);
    }

    // 5. Quota warnings
    const quotaNotifs = await getQuotaNotifications();
    for (const notif of quotaNotifs) {
      await sendNotification(notif);
      await sendEmailForNotification(notif.userId, notif.notificationType, notif);
      await recordNotification(notif.userId, notif.notificationType, notif.sessionId);
      await delay(NOTIFICATION_DELAY_MS);
    }

    // 6. Renewal reminders
    const renewalNotifs = await getRenewalReminders();
    for (const notif of renewalNotifs) {
      await sendNotification(notif);
      await sendEmailForNotification(notif.userId, notif.notificationType, notif);
      await recordNotification(notif.userId, notif.notificationType, notif.sessionId);
      await delay(NOTIFICATION_DELAY_MS);
    }

    const total = dunningNotifs.length + downgrades.length + trialNotifs.length +
      expiredNotifs.length + quotaNotifs.length + renewalNotifs.length;

    if (total > 0) {
      console.log(`[MONETIZATION] Sent ${total} notification(s): ` +
        `dunning=${dunningNotifs.length} downgrades=${downgrades.length} ` +
        `trial=${trialNotifs.length} expired=${expiredNotifs.length} ` +
        `quota=${quotaNotifs.length} renewal=${renewalNotifs.length}`);
    }
  } catch (err) {
    console.error('[MONETIZATION] Scheduler cycle error:', err);
  }
}

/**
 * Send a single notification via the user's active bot session.
 */
async function sendNotification(
  notif: DunningNotification | SubscriptionNotification,
): Promise<boolean> {
  try {
    const sock = getActiveBotSocket(notif.sessionId);
    if (!sock) {
      console.warn(`[MONETIZATION] No active socket for session ${notif.sessionId.slice(0, 8)}, skipping DM`);
      return false;
    }

    // Send as a direct message to the user's own number (private chat)
    await sock.sendMessage(notif.phoneJid, { text: notif.message });
    console.log(`[MONETIZATION] DM sent: type=${notif.notificationType} user=${notif.userId.slice(0, 8)}`);
    return true;
  } catch (err) {
    console.error(`[MONETIZATION] Failed to send DM: type=${notif.notificationType}`, err);
    return false;
  }
}

function getDowngradeMessage(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';
  return (
    `📉 *Plan Downgraded*\n\n` +
    `Your subscription has been downgraded to the Free plan due to payment failure.\n\n` +
    `*Free plan limits:*\n` +
    `• 300 messages/month\n` +
    `• 1 session\n` +
    `• 10 AI queries/day\n\n` +
    `You can upgrade again anytime:\n` +
    `💳 Send *!upgrade* to pay directly here\n` +
    `🌐 Dashboard: ${appUrl}/dashboard`
  );
}

/**
 * Send an email notification alongside the WhatsApp DM.
 * Looks up the user's email from auth and sends the appropriate template.
 */
async function sendEmailForNotification(
  userId: string,
  type: string,
  notif?: DunningNotification | SubscriptionNotification,
): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
    if (!authUser?.email) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    const username = profile?.username || 'User';

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, quota_used, quota_limit, next_renewal, failed_payment_count')
      .eq('user_id', userId)
      .single();

    const plan = sub?.plan || 'unknown';

    switch (type) {
      case 'trial_expiry_7d':
        await sendTrialExpiryEmail(authUser.email, username, plan, 7);
        break;
      case 'trial_expiry_3d':
        await sendTrialExpiryEmail(authUser.email, username, plan, 3);
        break;
      case 'trial_expiry_1d':
        await sendTrialExpiryEmail(authUser.email, username, plan, 1);
        break;
      case 'trial_expired':
        await sendTrialExpiredEmail(authUser.email, username, plan);
        break;
      case 'renewal_reminder':
        if (sub?.next_renewal) {
          await sendRenewalReminderEmail(authUser.email, username, plan, new Date(sub.next_renewal));
        }
        break;
      case 'quota_80':
      case 'quota_100':
        if (sub) {
          await sendQuotaWarningEmail(authUser.email, username, sub.quota_used || 0, sub.quota_limit || 1, plan);
        }
        break;
      case 'payment_failed':
      case 'retry_reminder':
      case 'final_warning':
        await sendPaymentFailedEmail(authUser.email, username, sub?.failed_payment_count || 1, 3);
        break;
    }
  } catch (err) {
    console.error(`[MONETIZATION] Email notification failed for ${type}:`, err);
  }
}

/**
 * Proactively downgrade subscriptions whose next_renewal date has passed.
 * This ensures expired plans are caught even if the user never visits the dashboard.
 */
async function downgradeExpiredPlans(): Promise<number> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const now = new Date().toISOString();

    const { data: expired } = await supabase
      .from('subscriptions')
      .select('user_id, plan')
      .neq('plan', 'free')
      .eq('status', 'active')
      .not('next_renewal', 'is', null)
      .lt('next_renewal', now);

    if (!expired || expired.length === 0) return 0;

    const freePlan = PLANS.free;
    for (const sub of expired) {
      await supabase
        .from('subscriptions')
        .update({
          plan: 'free',
          status: 'expired',
          quota_limit: freePlan.quotaLimit,
          quota_used: 0,
          session_limit: freePlan.sessionLimit,
          ai_daily_limit: freePlan.aiDailyLimit,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', sub.user_id);

      // Invalidate both Redis namespaces or the bot enforces the OLD (paid)
      // plan limits for up to SUBSCRIPTION_TTL (5 min) after expiry, and the
      // dashboard keeps showing the old plan badge.
      await invalidateRedisKey(`sub:${sub.user_id}`);
      await invalidateApiSubscription(sub.user_id);

      console.log(`[MONETIZATION] Expired plan downgraded: user=${sub.user_id.slice(0, 8)} plan=${sub.plan} -> free`);
    }

    return expired.length;
  } catch (err) {
    console.error('[MONETIZATION] Failed to downgrade expired plans:', err);
    return 0;
  }
}
