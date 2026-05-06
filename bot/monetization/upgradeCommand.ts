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
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

interface PlanInfo {
  name: string;
  price: number;
  quotaLimit: number;
  sessionLimit: number;
  aiDailyLimit: number;
  features: string[];
}

const PLANS: Record<string, PlanInfo> = {
  lite: {
    name: 'Lite',
    price: 500,
    quotaLimit: 2000,
    sessionLimit: 1,
    aiDailyLimit: 50,
    features: [
      '2,000 messages/month',
      '50 AI queries/day',
      'Auto reply',
      'Custom commands (5)',
      'Message templates (10)',
    ],
  },
  standard: {
    name: 'Standard',
    price: 1000,
    quotaLimit: 10000,
    sessionLimit: 3,
    aiDailyLimit: 200,
    features: [
      '10,000 messages/month',
      '3 sessions',
      '200 AI queries/day',
      'Status viewer',
      'Group analytics',
      'Flow builder (3 flows)',
    ],
  },
  boss: {
    name: 'Boss',
    price: 2000,
    quotaLimit: -1,
    sessionLimit: 5,
    aiDailyLimit: -1,
    features: [
      'Unlimited messages',
      '5 sessions',
      'Unlimited AI queries',
      'API access',
      'Custom branding',
      'Everything unlocked',
    ],
  },
};

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

  // Generate payment link
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

    // Get user email for Squad
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (!email) return null;

    const transactionRef = `bw-${plan}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    // Create payment record
    await supabase.from('payments').insert({
      user_id: userId,
      amount: planConfig.price,
      plan,
      status: 'pending',
      squad_transaction_ref: transactionRef,
      metadata: { source: 'whatsapp_upgrade' },
    });

    // Initialize Squad payment
    const secretKey = process.env.SQUAD_SECRET_KEY;
    if (!secretKey) {
      console.error('[UPGRADE] SQUAD_SECRET_KEY not configured');
      return null;
    }

    const baseUrl = process.env.SQUAD_SANDBOX === 'true'
      ? 'https://sandbox-api-d.squadco.com'
      : 'https://api-d.squadco.com';

    const res = await fetch(`${baseUrl}/transaction/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: planConfig.price * 100,
        initiate_type: 'inline',
        currency: 'NGN',
        transaction_ref: transactionRef,
        customer_name: userData.user?.user_metadata?.username || email,
        callback_url: `${appUrl}/dashboard?payment=success`,
        payment_channels: ['bank', 'transfer'],
        metadata: { user_id: userId, plan, source: 'whatsapp' },
      }),
    });

    const data = await res.json() as Record<string, unknown>;

    if (data.status === 200) {
      const innerData = data.data as Record<string, unknown> | undefined;
      return (innerData?.checkout_url as string) || null;
    }

    console.error('[UPGRADE] Squad API error:', data);
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
