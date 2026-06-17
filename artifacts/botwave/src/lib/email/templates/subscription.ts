import { baseTemplate } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

export function subscriptionTemplate(
  username: string,
  plan: string,
  action: 'activated' | 'renewed' | 'cancelled' | 'upgraded',
): string {
  const messages: Record<string, { color: string; text: string }> = {
    activated: { color: '#22c55e', text: `Your <strong>${plan}</strong> plan is now active.` },
    renewed: { color: '#3b82f6', text: `Your <strong>${plan}</strong> plan has been renewed.` },
    cancelled: { color: '#f59e0b', text: `Your <strong>${plan}</strong> plan has been cancelled. You'll retain access until the end of your billing period.` },
    upgraded: { color: '#8b5cf6', text: `You've been upgraded to the <strong>${plan}</strong> plan.` },
  };

  const msg = messages[action];

  return baseTemplate(`Subscription ${action}`, `
    <div style="background:${msg.color}15;border-radius:8px;padding:16px 20px;margin:0 0 20px;border-left:4px solid ${msg.color}">
      <p style="color:#f1f5f9;font-size:15px;margin:0;line-height:1.6">
        Hey ${username}, ${msg.text}
      </p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/dashboard/pricing" style="display:inline-block;background:#334155;color:#f1f5f9;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        View Plan Details
      </a>
    </div>
  `);
}
