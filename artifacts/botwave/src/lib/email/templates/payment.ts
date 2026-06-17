import { baseTemplate } from './base';

export function paymentTemplate(username: string, plan: string, amount: string, currency: string): string {
  return baseTemplate('Payment Confirmed', `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px">
      Hey ${username}, your payment has been confirmed.
    </p>
    <div style="background:#0f172a;border-radius:8px;padding:20px;margin:0 0 20px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:14px">Plan</td>
          <td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;font-weight:600">${plan}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:14px">Amount</td>
          <td style="padding:8px 0;color:#22c55e;font-size:14px;text-align:right;font-weight:600">${currency} ${amount}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:14px">Date</td>
          <td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
      </table>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0">
      Your plan features are now active. If you have questions about your subscription, contact support.
    </p>
  `);
}
