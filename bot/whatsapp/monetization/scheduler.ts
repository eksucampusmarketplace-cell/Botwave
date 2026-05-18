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
      await recordNotification(notif.userId, notif.notificationType, notif.sessionId);
      await delay(NOTIFICATION_DELAY_MS);
    }

    // 4. Expired trials
    const expiredNotifs = await getExpiredTrialNotifications();
    for (const notif of expiredNotifs) {
      await sendNotification(notif);
      await recordNotification(notif.userId, notif.notificationType, notif.sessionId);
      await delay(NOTIFICATION_DELAY_MS);
    }

    // 5. Quota warnings
    const quotaNotifs = await getQuotaNotifications();
    for (const notif of quotaNotifs) {
      await sendNotification(notif);
      await recordNotification(notif.userId, notif.notificationType, notif.sessionId);
      await delay(NOTIFICATION_DELAY_MS);
    }

    // 6. Renewal reminders
    const renewalNotifs = await getRenewalReminders();
    for (const notif of renewalNotifs) {
      await sendNotification(notif);
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

      console.log(`[MONETIZATION] Expired plan downgraded: user=${sub.user_id.slice(0, 8)} plan=${sub.plan} -> free`);
    }

    return expired.length;
  } catch (err) {
    console.error('[MONETIZATION] Failed to downgrade expired plans:', err);
    return 0;
  }
}
