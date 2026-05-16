import { baseTemplate } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

export function supportReplyTemplate(
  username: string,
  ticketSubject: string,
  replyPreview: string,
): string {
  const truncated = replyPreview.length > 300
    ? replyPreview.slice(0, 300) + '...'
    : replyPreview;

  return baseTemplate('New Reply on Your Support Ticket', `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px">
      Hey ${username}, a support agent has replied to your ticket:
    </p>
    <div style="background:#1a2332;border-radius:8px;padding:16px 20px;margin:0 0 12px;border-left:4px solid #3b82f6">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 4px;font-weight:600">Subject</p>
      <p style="color:#f1f5f9;font-size:15px;margin:0">${ticketSubject}</p>
    </div>
    <div style="background:#1a2332;border-radius:8px;padding:16px 20px;margin:0 0 20px;border-left:4px solid #22c55e">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 4px;font-weight:600">Reply</p>
      <p style="color:#e2e8f0;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap">${truncated}</p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/dashboard/settings" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        View Ticket
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0">
      You can reply directly from your dashboard. We'll keep you updated on any further responses.
    </p>
  `);
}
