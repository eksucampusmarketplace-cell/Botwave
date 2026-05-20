import { baseTemplate } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

export function trialExpiryTemplate(
  username: string,
  plan: string,
  daysLeft: number,
): string {
  const dayWord = daysLeft === 1 ? 'day' : 'days';
  const urgencyColor = daysLeft <= 1 ? '#ef4444' : daysLeft <= 3 ? '#f59e0b' : '#3b82f6';

  return baseTemplate('Trial Ending Soon', `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px">
      Hey ${username}, your <strong style="color:#f1f5f9">${plan}</strong> trial expires in <strong style="color:${urgencyColor}">${daysLeft} ${dayWord}</strong>.
    </p>
    <div style="background:${urgencyColor}15;border-radius:8px;padding:16px 20px;margin:0 0 20px;border-left:4px solid ${urgencyColor}">
      <p style="color:#f1f5f9;font-size:14px;margin:0;line-height:1.6">
        After your trial ends, you'll be moved to the Free plan with limited features (300 msgs/month, 1 session, 10 AI queries/day).
      </p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/dashboard/pricing" style="display:inline-block;background:#22c55e;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Upgrade Now
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0">
      Upgrade before your trial ends to keep all your premium features without interruption.
    </p>
  `);
}

export function trialExpiredTemplate(username: string, plan: string): string {
  return baseTemplate('Trial Ended', `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px">
      Hey ${username}, your <strong style="color:#f1f5f9">${plan}</strong> trial has expired.
    </p>
    <div style="background:#7f1d1d;border-radius:8px;padding:16px 20px;margin:0 0 20px;border-left:4px solid #ef4444">
      <p style="color:#fca5a5;font-size:14px;margin:0;line-height:1.6">
        You've been moved to the Free plan. Some features are now limited.
      </p>
    </div>
    <div style="background:#0f172a;border-radius:8px;padding:16px;margin:0 0 20px">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 8px"><strong style="color:#f1f5f9">Free plan limits:</strong></p>
      <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.8">
        &bull; 300 messages/month<br>
        &bull; 1 session<br>
        &bull; 10 AI queries/day
      </p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/dashboard/pricing" style="display:inline-block;background:#22c55e;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Upgrade to Keep Features
      </a>
    </div>
  `);
}
