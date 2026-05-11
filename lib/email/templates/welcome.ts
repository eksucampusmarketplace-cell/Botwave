import { baseTemplate } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

export function welcomeTemplate(username: string): string {
  return baseTemplate(`Welcome, ${username}!`, `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px">
      Your BotWave account is ready. Here's how to get started:
    </p>
    <div style="background:#0f172a;border-radius:8px;padding:20px;margin:0 0 20px">
      <p style="color:#f1f5f9;font-size:14px;margin:0 0 12px"><strong>1.</strong> Go to your <a href="${APP_URL}/dashboard/sessions" style="color:#60a5fa;text-decoration:none">Dashboard</a></p>
      <p style="color:#f1f5f9;font-size:14px;margin:0 0 12px"><strong>2.</strong> Create a new bot session</p>
      <p style="color:#f1f5f9;font-size:14px;margin:0 0 12px"><strong>3.</strong> Scan the QR code with WhatsApp</p>
      <p style="color:#f1f5f9;font-size:14px;margin:0"><strong>4.</strong> Your bot is live! Try <code style="background:#334155;padding:2px 6px;border-radius:4px;color:#60a5fa">!help</code> in any chat</p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Go to Dashboard
      </a>
    </div>
    <div style="background:#0f172a;border-radius:8px;padding:16px 20px;margin:0 0 20px;text-align:center">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 8px">Stay updated with new features & tips:</p>
      <a href="https://whatsapp.com/channel/0029Vb89xfPCMY0IvFWi6B0X" style="color:#22c55e;text-decoration:none;font-weight:600;font-size:14px">
        📢 Follow BotWave on WhatsApp
      </a>
    </div>
  `);
}
