import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { sendEmailDirect } from '@/lib/email';

async function getUser(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, subject, body: emailBody, mailboxId } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // If mailboxId is specified, use that; otherwise use the first mailbox
    let mailboxQuery = supabase
      .from('user_mailboxes')
      .select('*')
      .eq('user_id', user.id);

    if (mailboxId) {
      mailboxQuery = mailboxQuery.eq('id', mailboxId);
    }

    const { data: mailbox } = await mailboxQuery.single();

    if (!mailbox) {
      return NextResponse.json({ error: 'No mailbox found' }, { status: 404 });
    }

    if (!mailbox.is_active) {
      return NextResponse.json({ error: 'Mailbox is suspended' }, { status: 403 });
    }

    // Check daily send limit
    const now = new Date();
    const lastReset = new Date(mailbox.last_send_reset);
    let dailyCount = mailbox.daily_send_count;

    if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
      dailyCount = 0;
      await supabase
        .from('user_mailboxes')
        .update({ daily_send_count: 0, last_send_reset: now.toISOString() })
        .eq('id', mailbox.id);
    }

    if (dailyCount >= mailbox.daily_send_limit) {
      return NextResponse.json(
        { error: `Daily send limit reached (${mailbox.daily_send_limit}). Try again tomorrow.` },
        { status: 429 },
      );
    }

    // Send email via Postal usermail channel
    const result = await sendEmailDirect({
      channel: 'usermail',
      to,
      subject,
      html: emailBody,
      fromAddress: mailbox.email_address,
      fromName: mailbox.display_name || user.user_metadata?.username,
      replyTo: mailbox.email_address,
    });

    if (!result.success) {
      return NextResponse.json({ error: `Failed to send: ${result.error}` }, { status: 500 });
    }

    // Record the sent email
    await supabase.from('user_emails').insert({
      mailbox_id: mailbox.id,
      message_id: result.messageId,
      direction: 'outbound',
      from_address: mailbox.email_address,
      from_name: mailbox.display_name,
      to_address: to,
      subject,
      body_html: emailBody,
      is_read: true,
      folder: 'sent',
    });

    // Increment daily send count
    await supabase
      .from('user_mailboxes')
      .update({ daily_send_count: dailyCount + 1 })
      .eq('id', mailbox.id);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (err) {
    console.error('[MAILBOX] Send error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
