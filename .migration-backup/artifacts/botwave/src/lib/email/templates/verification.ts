import { baseTemplate } from './base';

export function verificationTemplate(code: string, username: string): string {
  return baseTemplate('Verify your email', `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px">
      Hey ${username}, enter this code to verify your email address:
    </p>
    <div style="text-align:center;margin:24px 0">
      <div style="display:inline-block;background:#0f172a;border:2px solid #3b82f6;border-radius:12px;padding:16px 40px;letter-spacing:8px;font-size:32px;font-weight:700;color:#60a5fa;font-family:monospace">
        ${code}
      </div>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:24px 0 0">
      This code expires in <strong style="color:#f1f5f9">10 minutes</strong>. If you didn't create a BotWave account, ignore this email.
    </p>
  `);
}
