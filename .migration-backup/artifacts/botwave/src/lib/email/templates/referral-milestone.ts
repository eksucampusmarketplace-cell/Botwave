import { baseTemplate } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

export function referralMilestoneTemplate(
  username: string,
  totalReferred: number,
  totalEarned: number,
): string {
  return baseTemplate('Referral Milestone Reached!', `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px">
      Hey ${username}, congratulations on your referral milestone!
    </p>
    <div style="background:#16a34a15;border-radius:8px;padding:16px 20px;margin:0 0 20px;border-left:4px solid #22c55e">
      <p style="color:#f1f5f9;font-size:15px;margin:0;line-height:1.6">
        You've referred <strong style="color:#22c55e">${totalReferred}</strong> users and earned <strong style="color:#22c55e">${totalEarned}</strong> reward points!
      </p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/dashboard/referrals" style="display:inline-block;background:#22c55e;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        View Referrals
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0">
      Keep sharing your referral code to earn more rewards. Each successful referral earns you bonus points!
    </p>
  `);
}
