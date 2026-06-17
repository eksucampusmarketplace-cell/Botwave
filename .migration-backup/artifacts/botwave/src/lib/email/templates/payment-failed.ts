import { baseTemplate } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

export function paymentFailedTemplate(
  username: string,
  attempt: number,
  maxAttempts: number,
): string {
  const isLastWarning = attempt >= maxAttempts;
  const color = isLastWarning ? '#ef4444' : '#f59e0b';
  const title = isLastWarning ? 'Final Payment Warning' : 'Payment Failed';

  return baseTemplate(title, `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px">
      Hey ${username}, your subscription payment could not be processed.
    </p>
    <div style="background:${color}15;border-radius:8px;padding:16px 20px;margin:0 0 20px;border-left:4px solid ${color}">
      <p style="color:#f1f5f9;font-size:14px;margin:0;line-height:1.6">
        ${isLastWarning
          ? 'This is your <strong>final warning</strong>. Your plan will be downgraded to Free tomorrow if payment is not completed.'
          : `Payment attempt ${attempt} of ${maxAttempts} failed. Your plan is still active, but please update your payment method.`
        }
      </p>
    </div>
    <div style="background:#0f172a;border-radius:8px;padding:16px;margin:0 0 20px">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 8px"><strong style="color:#f1f5f9">If not resolved:</strong></p>
      <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.8">
        &bull; Messages limited to 300/month<br>
        &bull; Only 1 session allowed<br>
        &bull; AI queries reduced to 10/day
      </p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/dashboard/pricing" style="display:inline-block;background:${color};color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Update Payment
      </a>
    </div>
  `);
}
