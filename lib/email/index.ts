import type { EmailChannel, EmailEnvelope, EmailResult } from './types';
import { CHANNEL_CONFIG } from './types';
import { getTransporter } from './transporter';
import { enqueueEmail } from './queue';
import { shouldSendEmail } from './bounce';
import { checkDomainRateLimit } from './domain-rate-limit';

export type { EmailChannel, EmailEnvelope, EmailResult };
export { CHANNEL_CONFIG } from './types';
export { enqueueEmail, getQueueStats, retryDeadLetterQueue, startEmailQueueProcessor, stopEmailQueueProcessor } from './queue';
export { shouldSendEmail, recordBounce, recordUnsubscribe } from './bounce';
export { checkDomainRateLimit, getDomainQuota } from './domain-rate-limit';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

export async function sendEmailDirect(envelope: EmailEnvelope): Promise<EmailResult> {
  // Check bounce/unsubscribe status before sending
  const sendCheck = await shouldSendEmail(envelope.to).catch(() => ({ allowed: true }));
  if (!sendCheck.allowed) {
    console.log(`[EMAIL] Skipped ${envelope.to}: ${sendCheck.reason}`);
    return { success: false, error: `recipient_${sendCheck.reason}` };
  }

  // Check domain rate limit
  if (!checkDomainRateLimit(envelope.to)) {
    return { success: false, error: 'domain_rate_limited' };
  }

  const config = CHANNEL_CONFIG[envelope.channel];
  const from = envelope.fromAddress || config.defaultFrom;
  const fromName = envelope.fromName || config.defaultFromName;

  // Build unsubscribe URL
  const unsubToken = Buffer.from(envelope.to).toString('base64url');
  const unsubUrl = `${APP_URL}/api/email/unsubscribe?token=${unsubToken}`;

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
        'List-Unsubscribe': `<${unsubUrl}>, <mailto:unsubscribe@${config.domain}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
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
  const result = await sendEmailDirect({
    channel: 'auth',
    to,
    subject: `${code} is your BotWave verification code`,
    html: verificationTemplate(code, username),
  });
  return result.messageId || '';
}

export async function sendForgotPasswordEmail(to: string, resetUrl: string, username: string): Promise<string> {
  const { forgotPasswordTemplate } = await import('./templates/forgot-password');
  const result = await sendEmailDirect({
    channel: 'auth',
    to,
    subject: 'Reset your BotWave password',
    html: forgotPasswordTemplate(resetUrl, username),
  });
  return result.messageId || '';
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
    subject: `Payment confirmed - ${plan} plan`,
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
    subject: `Subscription ${action} - ${plan} plan`,
    html: subscriptionTemplate(username, plan, action),
  });
}

export async function sendSupportReplyEmail(
  to: string,
  username: string,
  ticketSubject: string,
  replyPreview: string,
): Promise<string> {
  const { supportReplyTemplate } = await import('./templates/support-reply');
  return sendEmail({
    channel: 'notify',
    to,
    subject: `Reply on your support ticket: ${ticketSubject}`,
    html: supportReplyTemplate(username, ticketSubject, replyPreview),
  });
}

export async function sendTrialExpiryEmail(
  to: string,
  username: string,
  plan: string,
  daysLeft: number,
): Promise<string> {
  const { trialExpiryTemplate } = await import('./templates/trial-expiry');
  return sendEmail({
    channel: 'billing',
    to,
    subject: `Your ${plan} trial expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html: trialExpiryTemplate(username, plan, daysLeft),
  });
}

export async function sendTrialExpiredEmail(
  to: string,
  username: string,
  plan: string,
): Promise<string> {
  const { trialExpiredTemplate } = await import('./templates/trial-expiry');
  return sendEmail({
    channel: 'billing',
    to,
    subject: 'Your trial has ended - you\'re now on the Free plan',
    html: trialExpiredTemplate(username, plan),
  });
}

export async function sendRenewalReminderEmail(
  to: string,
  username: string,
  plan: string,
  renewalDate: Date,
): Promise<string> {
  const { renewalReminderTemplate } = await import('./templates/renewal-reminder');
  return sendEmail({
    channel: 'billing',
    to,
    subject: `Subscription renewal reminder - ${plan} plan`,
    html: renewalReminderTemplate(username, plan, renewalDate),
  });
}

export async function sendQuotaWarningEmail(
  to: string,
  username: string,
  used: number,
  limit: number,
  plan: string,
): Promise<string> {
  const { quotaWarningTemplate } = await import('./templates/quota-warning');
  const percent = Math.round((used / limit) * 100);
  return sendEmail({
    channel: 'notify',
    to,
    subject: percent >= 100 ? 'Message quota reached' : `Message quota at ${percent}%`,
    html: quotaWarningTemplate(username, used, limit, plan),
  });
}

export async function sendPaymentFailedEmail(
  to: string,
  username: string,
  attempt: number,
  maxAttempts: number,
): Promise<string> {
  const { paymentFailedTemplate } = await import('./templates/payment-failed');
  return sendEmail({
    channel: 'billing',
    to,
    subject: attempt >= maxAttempts ? 'Final payment warning - action required' : 'Payment failed - please update',
    html: paymentFailedTemplate(username, attempt, maxAttempts),
  });
}

export async function sendApiKeyCreatedEmail(
  to: string,
  username: string,
  keyName: string,
  keyPrefix: string,
): Promise<string> {
  const { apiKeyCreatedTemplate } = await import('./templates/api-key-event');
  return sendEmail({
    channel: 'notify',
    to,
    subject: 'New API key created on your account',
    html: apiKeyCreatedTemplate(username, keyName, keyPrefix),
  });
}

export async function sendApiKeyRevokedEmail(
  to: string,
  username: string,
  keyName: string,
): Promise<string> {
  const { apiKeyRevokedTemplate } = await import('./templates/api-key-event');
  return sendEmail({
    channel: 'notify',
    to,
    subject: 'API key revoked from your account',
    html: apiKeyRevokedTemplate(username, keyName),
  });
}

export async function sendReferralMilestoneEmail(
  to: string,
  username: string,
  totalReferred: number,
  totalEarned: number,
): Promise<string> {
  const { referralMilestoneTemplate } = await import('./templates/referral-milestone');
  return sendEmail({
    channel: 'notify',
    to,
    subject: `Referral milestone: ${totalReferred} users referred!`,
    html: referralMilestoneTemplate(username, totalReferred, totalEarned),
  });
}

export async function sendReengagementEmail(
  to: string,
  username: string,
  hasLinkedDevice: boolean,
): Promise<string> {
  const { reengagementTemplate } = await import('./templates/reengagement');
  return sendEmail({
    channel: 'notify',
    to,
    subject: 'We miss you on BotWave - come see what\'s new',
    html: reengagementTemplate(username, hasLinkedDevice),
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
