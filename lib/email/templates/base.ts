const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

export function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="text-align:center;padding:24px 0">
      <span style="font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px">⚡ BotWave</span>
    </div>
    <div style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155">
      <div style="padding:32px 24px">
        <h1 style="margin:0 0 16px;color:#f1f5f9;font-size:22px;font-weight:600">${title}</h1>
        ${content}
      </div>
    </div>
    <div style="text-align:center;padding:24px 0">
      <p style="color:#475569;font-size:12px;margin:0">
        <a href="${APP_URL}" style="color:#60a5fa;text-decoration:none">botwave.online</a> - WhatsApp Bot Automation
      </p>
      <p style="color:#475569;font-size:12px;margin:8px 0 0">
        <a href="https://whatsapp.com/channel/0029Vb89xfPCMY0IvFWi6B0X" style="color:#22c55e;text-decoration:none">📢 Follow our WhatsApp Channel</a>
      </p>
      <p style="color:#334155;font-size:11px;margin:8px 0 0">
        You received this because you have a BotWave account.
      </p>
    </div>
  </div>
</body>
</html>`;
}
