import { NextResponse, type NextRequest } from 'next/server';
import { sendEmailDirect, getQueueStats, retryDeadLetterQueue, CHANNEL_CONFIG } from '@/lib/email';
import type { EmailChannel } from '@/lib/email';
import { getAllChannelHealth } from '@/lib/email/spam-protection';
import { verifyAdminToken } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token');
  const tokenValid = await verifyAdminToken(adminToken?.value);
  if (!tokenValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getQueueStats();
    const channels = Object.entries(CHANNEL_CONFIG).map(([key, config]) => ({
      channel: key,
      domain: config.domain,
      defaultFrom: config.defaultFrom,
      defaultFromName: config.defaultFromName,
    }));

    const health = await getAllChannelHealth();

    return NextResponse.json({
      success: true,
      data: { queueStats: stats, channels, channelHealth: health },
    });
  } catch (err) {
    console.error('[ADMIN-EMAIL] Stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token');
  const tokenValid = await verifyAdminToken(adminToken?.value);
  if (!tokenValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'test') {
      const { channel, to, subject, content } = body as {
        channel: EmailChannel;
        to: string;
        subject: string;
        content: string;
      };

      if (!channel || !to || !subject) {
        return NextResponse.json({ error: 'channel, to, and subject are required' }, { status: 400 });
      }

      if (!CHANNEL_CONFIG[channel]) {
        return NextResponse.json({ error: `Invalid channel: ${channel}` }, { status: 400 });
      }

      const html = `
        <div style="font-family:sans-serif;padding:20px;background:#1e293b;color:#e2e8f0;border-radius:8px;">
          <h2 style="color:#60a5fa;margin-top:0;">Test Email - ${channel}</h2>
          <p>${content || 'This is a test email sent from the BotWave Admin Panel.'}</p>
          <hr style="border-color:#334155;margin:16px 0;" />
          <p style="color:#64748b;font-size:12px;">
            Sent via <strong>${CHANNEL_CONFIG[channel].domain}</strong> at ${new Date().toISOString()}
          </p>
        </div>
      `;

      const result = await sendEmailDirect({
        channel,
        to,
        subject: subject || `[BotWave Test] ${channel} channel test`,
        html,
      });

      return NextResponse.json({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });
    }

    if (action === 'retry-dlq') {
      const count = await retryDeadLetterQueue();
      return NextResponse.json({ success: true, retriedCount: count });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[ADMIN-EMAIL] Action error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
