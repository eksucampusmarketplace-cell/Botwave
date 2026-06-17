import { baseTemplate } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

export function apiKeyCreatedTemplate(username: string, keyName: string, keyPrefix: string): string {
  return baseTemplate('API Key Created', `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px">
      Hey ${username}, a new API key has been created on your account.
    </p>
    <div style="background:#0f172a;border-radius:8px;padding:20px;margin:0 0 20px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:14px">Name</td>
          <td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;font-weight:600">${keyName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:14px">Key Prefix</td>
          <td style="padding:8px 0;color:#60a5fa;font-size:14px;text-align:right;font-family:monospace">${keyPrefix}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:14px">Created</td>
          <td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
      </table>
    </div>
    <div style="background:#78350f;border-radius:8px;padding:16px 20px;margin:0 0 20px;border-left:4px solid #f59e0b">
      <p style="color:#fcd34d;font-size:14px;margin:0">
        If you did not create this key, revoke it immediately from your dashboard.
      </p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/dashboard/settings" style="display:inline-block;background:#334155;color:#f1f5f9;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Manage API Keys
      </a>
    </div>
  `);
}

export function apiKeyRevokedTemplate(username: string, keyName: string): string {
  return baseTemplate('API Key Revoked', `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px">
      Hey ${username}, an API key has been revoked from your account.
    </p>
    <div style="background:#0f172a;border-radius:8px;padding:16px 20px;margin:0 0 20px">
      <p style="color:#f1f5f9;font-size:14px;margin:0">
        Key <strong>${keyName}</strong> has been permanently deleted and can no longer be used.
      </p>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0">
      If you did not revoke this key, please secure your account immediately.
    </p>
  `);
}
