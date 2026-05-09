/**
 * In-WhatsApp upgrade flow.
 *
 * Instead of "go to the dashboard", users can:
 * - !upgrade — see plans and pricing
 * - !upgrade lite — initiate payment for Lite plan
 * - !upgrade standard — initiate payment for Standard plan
 * - !upgrade boss — initiate payment for Boss plan
 *
 * The command generates a Squad payment link and sends it directly
 * in the chat, so the user can tap to pay without leaving WhatsApp.
 */

import { registerCommand, type MessageContext } from '../commands/registry';
import { sendReply } from '../commands/helpers';
import { getUserSubscription, getSessionUserId } from '../database';
import { PLANS, type PlanConfig } from '../../lib/squad';
import { initializePayment } from '../../lib/squad';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function handleUpgrade(
  context: MessageContext,
  args: string[],
  sock: any,
): Promise<void> {
  const userId = context.userId || (context.sessionId ? await getSessionUserId(context.sessionId) : null);
  if (!userId) {
    await sendReply(context.chatJid, 'Could not determine your account.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const sub = await getUserSubscription(userId);
  const requestedPlan = args[0]?.toLowerCase();

  // No plan specified — show plan comparison
  if (!requestedPlan) {
    await showPlanMenu(context, sock, sub.plan);
    return;
  }

  // Validate plan
  if (!PLANS[requestedPlan] || requestedPlan === 'free') {
    await sendReply(
      context.chatJid,
      `❌ Invalid plan. Choose one of: *lite*, *standard*, *boss*\n\nSend *!upgrade* to see all plans.`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // Already on this plan
  if (sub.plan === requestedPlan && sub.status === 'active') {
    await sendReply(
      context.chatJid,
      `✨ You're already on the *${PLANS[requestedPlan].name}* plan!\n\nSend *!plan* to see your usage.`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // Generate payment link using shared Squad client
  const paymentLink = await generatePaymentLink(userId, requestedPlan);

  if (!paymentLink) {
    await sendReply(
      context.chatJid,
      `⚠️ Couldn't generate payment link right now. Please try again or visit your dashboard.`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  const plan = PLANS[requestedPlan];
  if (!plan) return;
  const msg =
    `💳 *Upgrade to ${plan.name}* — ₦${plan.price.toLocaleString()}/mo\n\n` +
    `*What you get:*\n` +
    plan.features.map(f => `• ${f}`).join('\n') + '\n\n' +
    `━━━━━━━━━━━━━━━━━\n` +
    `🔗 *Tap to pay:*\n${paymentLink}\n` +
    `━━━━━━━━━━━━━━━━━\n\n` +
    `Payment is via bank transfer. Your plan activates instantly after payment confirms.\n\n` +
    `_Link expires in 30 minutes. Send !upgrade ${requestedPlan} again if it does._`;

  await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
}

async function showPlanMenu(
  context: MessageContext,
  sock: any,
  currentPlan: string,
): Promise<void> {
  const currentIndicator = (plan: string) => plan === currentPlan ? ' ← *current*' : '';

  const msg =
    `📋 *BotWave Plans*\n\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `*FREE*${currentIndicator('free')}\n` +
    `₦0 • 300 msgs/mo • 1 session • 10 AI/day\n\n` +
    `*LITE*${currentIndicator('lite')}\n` +
    `₦500/mo • 2,000 msgs • 1 session • 50 AI/day\n` +
    `+ Auto reply, custom commands, templates\n\n` +
    `*STANDARD*${currentIndicator('standard')}\n` +
    `₦1,000/mo • 10,000 msgs • 3 sessions • 200 AI/day\n` +
    `+ Status viewer, analytics, flow builder\n\n` +
    `*BOSS*${currentIndicator('boss')}\n` +
    `₦2,000/mo • Unlimited everything • 5 sessions\n` +
    `+ API access, custom branding, all features\n` +
    `━━━━━━━━━━━━━━━━━\n\n` +
    `*To upgrade, send:*\n` +
    `• !upgrade lite\n` +
    `• !upgrade standard\n` +
    `• !upgrade boss\n\n` +
    `_Payment is instant via bank transfer. Plan activates immediately._`;

  await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
}

async function generatePaymentLink(userId: string, plan: string): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const planConfig = PLANS[plan];
    if (!planConfig) return null;

    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (!email) return null;

    const transactionRef = `bw-${plan}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    await supabase.from('payments').insert({
      user_id: userId,
      amount: planConfig.price,
      plan,
      status: 'pending',
      squad_transaction_ref: transactionRef,
      metadata: { source: 'whatsapp_upgrade' },
    });

    const result = await initializePayment({
      email,
      amount: planConfig.price,
      transactionRef,
      customerName: userData.user?.user_metadata?.username || email,
      callbackUrl: `${appUrl}/dashboard?payment=success`,
      metadata: { user_id: userId, plan, source: 'whatsapp' },
    });

    if (result.success && result.checkoutUrl) {
      return result.checkoutUrl;
    }

    console.error('[UPGRADE] Squad payment init failed:', result.error);
    return null;
  } catch (err) {
    console.error('[UPGRADE] Failed to generate payment link:', err);
    return null;
  }
}

// ─── Register Command ───────────────────────────────────────────────────────

registerCommand({
  name: 'upgrade',
  aliases: ['upgrade', 'subscribe', 'pay', 'pricing', 'plans'],
  category: 'admin',
  description: 'View plans and upgrade subscription via WhatsApp',
  execute: (ctx, args, sock) => handleUpgrade(ctx, args, sock),
});
