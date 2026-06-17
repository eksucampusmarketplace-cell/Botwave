import { baseTemplate } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

export function sessionDownTemplate(username: string, sessionId: string): string {
  const shortId = sessionId.slice(0, 8);
  return baseTemplate('Session Disconnected', `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px">
      Hey ${username}, your WhatsApp session <strong style="color:#f1f5f9">${shortId}</strong> has been disconnected.
    </p>
    <div style="background:#7f1d1d;border-radius:8px;padding:16px 20px;margin:0 0 20px;border-left:4px solid #ef4444">
      <p style="color:#fca5a5;font-size:14px;margin:0">
        Your bot is offline and won't respond to messages until you reconnect.
      </p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/dashboard/sessions" style="display:inline-block;background:#ef4444;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Reconnect Now
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0">
      This can happen if WhatsApp detected unusual activity or you logged out from your phone. Scan a new QR code to reconnect.
    </p>
  `);
}
