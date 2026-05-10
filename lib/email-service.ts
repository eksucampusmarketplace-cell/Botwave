/**
 * Email Service — sends alert emails via SMTP (Postal or any SMTP server).
 *
 * Configuration via environment variables:
 *   SMTP_HOST     — SMTP server hostname (e.g. postal.botwave.online)
 *   SMTP_PORT     — SMTP port (default: 25)
 *   SMTP_USER     — SMTP username (Postal credential username)
 *   SMTP_PASS     — SMTP password (Postal credential password)
 *   SMTP_FROM     — From address (e.g. alerts@botwave.online)
 *   ALERT_EMAIL   — Where to send alerts (e.g. admin's email)
 */

import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '25', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  return transporter;
}

export interface AlertEmail {
  subject: string;
  text: string;
  html?: string;
}

export async function sendAlertEmail(alert: AlertEmail): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.warn('[EMAIL] SMTP not configured — skipping email alert');
    return false;
  }

  const from = process.env.SMTP_FROM || 'alerts@botwave.online';
  const to = process.env.ALERT_EMAIL;
  if (!to) {
    console.warn('[EMAIL] ALERT_EMAIL not set — skipping email alert');
    return false;
  }

  try {
    await transport.sendMail({
      from: `BotWave Alerts <${from}>`,
      to,
      subject: alert.subject,
      text: alert.text,
      html: alert.html,
    });
    console.log(`[EMAIL] Alert sent: "${alert.subject}" → ${to}`);
    return true;
  } catch (err) {
    console.error('[EMAIL] Failed to send alert:', err);
    return false;
  }
}

export function buildAlertHtml(
  title: string,
  severity: 'critical' | 'warning' | 'info',
  details: Record<string, string | number>,
  timestamp?: string,
): string {
  const colors = {
    critical: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };
  const color = colors[severity];
  const time = timestamp || new Date().toISOString();

  const detailRows = Object.entries(details)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#94a3b8">${k}</td><td style="padding:6px 12px;color:#e2e8f0">${v}</td></tr>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155">
      <div style="background:${color};padding:16px 24px">
        <h1 style="margin:0;color:#fff;font-size:18px">⚡ BotWave Alert: ${title}</h1>
      </div>
      <div style="padding:24px">
        <span style="display:inline-block;padding:4px 12px;border-radius:9999px;background:${color}22;color:${color};font-size:12px;font-weight:600;text-transform:uppercase">${severity}</span>
        <table style="width:100%;margin-top:16px;border-collapse:collapse">
          ${detailRows}
        </table>
        <p style="margin-top:16px;color:#64748b;font-size:12px">Timestamp: ${time}</p>
      </div>
    </div>
    <p style="text-align:center;color:#475569;font-size:11px;margin-top:16px">BotWave Health Monitor • botwave.online</p>
  </div>
</body>
</html>`;
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.ALERT_EMAIL);
}
