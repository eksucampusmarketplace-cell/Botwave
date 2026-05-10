import type { EmailChannel, EmailEnvelope, EmailResult } from './types';
import { CHANNEL_CONFIG } from './types';
import { getTransporter } from './transporter';
import { enqueueEmail } from './queue';

export type { EmailChannel, EmailEnvelope, EmailResult };
export { CHANNEL_CONFIG } from './types';
export { enqueueEmail, getQueueStats, retryDeadLetterQueue, startEmailQueueProcessor, stopEmailQueueProcessor } from './queue';

export async function sendEmailDirect(envelope: EmailEnvelope): Promise<EmailResult> {
  const config = CHANNEL_CONFIG[envelope.channel];
  const from = envelope.fromAddress || config.defaultFrom;
  const fromName = envelope.fromName || config.defaultFromName;

  try {
    const transport = getTransporter(envelope.channel);
    const info = await transport.sendMail({
      from: `${fromName} <${from}>`,
      to: envelope.to,
      subject: envelope.subject,
      html: envelope.html,
      text: envelope.text || stripHtml(envelope.html),
      replyTo: envelope.replyTo,
      headers: {
        'X-BotWave-Channel': envelope.channel,
        'List-Unsubscribe': `<mailto:unsubscribe@${config.domain}>`,
      },
    });

    console.log(`[EMAIL] Sent via ${envelope.channel}: "${envelope.subject}" → ${envelope.to} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL] Failed via ${envelope.channel}: "${envelope.subject}" → ${envelope.to}: ${message}`);
    return { success: false, error: message };
  }
}

export async function sendEmail(envelope: EmailEnvelope): Promise<string> {
  return enqueueEmail(envelope);
}

// --- Convenience helpers ---

export async function sendVerificationEmail(to: string, code: string, username: string): Promise<string> {
  const { verificationTemplate } = await import('./templates/verification');
  return sendEmail({
    channel: 'auth',
    to,
    subject: `${code} is your BotWave verification code`,
    html: verificationTemplate(code, username),
  });
}

export async function sendForgotPasswordEmail(to: string, resetUrl: string, username: string): Promise<string> {
  const { forgotPasswordTemplate } = await import('./templates/forgot-password');
  return sendEmail({
    channel: 'auth',
    to,
    subject: 'Reset your BotWave password',
    html: forgotPasswordTemplate(resetUrl, username),
  });
}

export async function sendWelcomeEmail(to: string, username: string): Promise<string> {
  const { welcomeTemplate } = await import('./templates/welcome');
  return sendEmail({
    channel: 'welcome',
    to,
    subject: `Welcome to BotWave, ${username}! 🤖`,
    html: welcomeTemplate(username),
  });
}

export async function sendSessionDownEmail(to: string, username: string, sessionId: string): Promise<string> {
  const { sessionDownTemplate } = await import('./templates/session-down');
  return sendEmail({
    channel: 'notify',
    to,
    subject: '⚠️ WhatsApp Session Disconnected',
    html: sessionDownTemplate(username, sessionId),
  });
}

export async function sendPaymentConfirmationEmail(
  to: string,
  username: string,
  plan: string,
  amount: string,
  currency: string,
): Promise<string> {
  const { paymentTemplate } = await import('./templates/payment');
  return sendEmail({
    channel: 'billing',
    to,
    subject: `Payment confirmed — ${plan} plan`,
    html: paymentTemplate(username, plan, amount, currency),
  });
}

export async function sendSubscriptionEmail(
  to: string,
  username: string,
  plan: string,
  action: 'activated' | 'renewed' | 'cancelled' | 'upgraded',
): Promise<string> {
  const { subscriptionTemplate } = await import('./templates/subscription');
  return sendEmail({
    channel: 'billing',
    to,
    subject: `Subscription ${action} — ${plan} plan`,
    html: subscriptionTemplate(username, plan, action),
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
