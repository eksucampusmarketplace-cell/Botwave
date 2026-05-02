import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json();

    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    
    // Get user email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    // Since profiles might not have email (Supabase auth.users has it), 
    // we should ideally fetch from auth.admin.getUserById(userId)
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user || !user.email) {
      console.error('Failed to fetch user for notification:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/sessions`;

    await resend.emails.send({
      from: 'BotWave <noreply@botwave.dev>',
      to: user.email,
      subject: '⚠️ WhatsApp Session Disconnected',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #dc2626;">Session Disconnected</h2>
          <p>Hello ${profile?.username || 'User'},</p>
          <p>Your WhatsApp session <strong>${sessionId.slice(0, 8)}</strong> has been disconnected or flagged by WhatsApp.</p>
          <p>To keep your bot running, you need to re-authenticate by scanning a new QR code.</p>
          <div style="margin: 30px 0;">
            <a href="${dashboardUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reconnect Now</a>
          </div>
          <p style="color: #666; font-size: 0.9em;">If you didn't expect this, it might be due to WhatsApp's security measures. Use random delays to avoid future bans.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 0.8em;">&copy; 2024 BotWave Platform</p>
        </div>
      `
    });

    return NextResponse.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Notification route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
