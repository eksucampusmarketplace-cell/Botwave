import { baseTemplate } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

export function quotaWarningTemplate(
  username: string,
  used: number,
  limit: number,
  plan: string,
): string {
  const percent = Math.round((used / limit) * 100);
  const isExhausted = percent >= 100;
  const color = isExhausted ? '#ef4444' : '#f59e0b';
  const title = isExhausted ? 'Quota Reached' : `Quota Warning - ${percent}% Used`;

  return baseTemplate(title, `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px">
      Hey ${username}, ${isExhausted
        ? `you've used all <strong style="color:#ef4444">${limit.toLocaleString()}</strong> messages for this month.`
        : `you've used <strong style="color:${color}">${used.toLocaleString()}</strong> of <strong style="color:#f1f5f9">${limit.toLocaleString()}</strong> messages this month.`
      }
    </p>
    <div style="background:#0f172a;border-radius:8px;padding:16px;margin:0 0 20px">
      <div style="background:#334155;border-radius:4px;height:8px;overflow:hidden">
        <div style="background:${color};height:100%;width:${Math.min(percent, 100)}%;border-radius:4px"></div>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;text-align:center">
        ${used.toLocaleString()} / ${limit.toLocaleString()} messages (${percent}%)
      </p>
    </div>
    ${isExhausted ? `
    <div style="background:#7f1d1d;border-radius:8px;padding:16px 20px;margin:0 0 20px;border-left:4px solid #ef4444">
      <p style="color:#fca5a5;font-size:14px;margin:0">
        Bot commands are paused until your quota resets or you upgrade.
      </p>
    </div>` : `
    <div style="background:#78350f;border-radius:8px;padding:16px 20px;margin:0 0 20px;border-left:4px solid #f59e0b">
      <p style="color:#fcd34d;font-size:14px;margin:0">
        At this rate you may run out before your monthly reset.
      </p>
    </div>`}
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/dashboard/pricing" style="display:inline-block;background:#22c55e;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Upgrade for More
      </a>
    </div>
  `);
}
