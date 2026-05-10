import { baseTemplate } from './base';

export function forgotPasswordTemplate(resetUrl: string, username: string): string {
  return baseTemplate('Reset your password', `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px">
      Hey ${username}, we received a request to reset your password.
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${resetUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Reset Password
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:24px 0 0">
      This link expires in <strong style="color:#f1f5f9">30 minutes</strong>. If you didn't request this, ignore this email — your password won't change.
    </p>
    <p style="color:#64748b;font-size:12px;margin:16px 0 0;word-break:break-all">
      ${resetUrl}
    </p>
  `);
}
