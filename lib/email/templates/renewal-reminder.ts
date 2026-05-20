import { baseTemplate } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

export function renewalReminderTemplate(
  username: string,
  plan: string,
  renewalDate: Date,
): string {
  const formatted = renewalDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return baseTemplate('Subscription Renewal Reminder', `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px">
      Hey ${username}, your <strong style="color:#f1f5f9">${plan}</strong> subscription renews on <strong style="color:#3b82f6">${formatted}</strong>.
    </p>
    <div style="background:#1e3a5f;border-radius:8px;padding:16px 20px;margin:0 0 20px;border-left:4px solid #3b82f6">
      <p style="color:#93c5fd;font-size:14px;margin:0;line-height:1.6">
        Make sure your payment method is up to date to avoid service interruption.
      </p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/dashboard/pricing" style="display:inline-block;background:#334155;color:#f1f5f9;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Manage Subscription
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0">
      If you no longer wish to renew, you can cancel from your dashboard before the renewal date.
    </p>
  `);
}
