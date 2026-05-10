import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user/mailbox/webhook
 * Receives incoming emails from Postal's HTTP endpoint.
 * Postal sends a JSON payload when an email arrives for mail.botwave.online.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Postal webhook sends different event types
    const rcptTo = body.rcpt_to || body.to;
    const from = body.mail_from || body.from;
    const subject = body.subject || '(no subject)';
    const htmlBody = body.html_body || body.plain_body || '';
    const textBody = body.plain_body || '';
    const messageId = body.message_id || body.id;

    if (!rcptTo) {
      return NextResponse.json({ ok: true });
    }

    // Extract local part from the recipient address (e.g., "chris" from "chris@mail.botwave.online")
    const recipientEmail = Array.isArray(rcptTo) ? rcptTo[0] : rcptTo;
    if (!recipientEmail || !recipientEmail.includes('@mail.botwave.online')) {
      return NextResponse.json({ ok: true });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Find the mailbox for this recipient
    const { data: mailbox } = await supabase
      .from('user_mailboxes')
      .select('id, is_active')
      .eq('email_address', recipientEmail.toLowerCase())
      .single();

    if (!mailbox) {
      console.log(`[MAILBOX-WEBHOOK] No mailbox for ${recipientEmail}`);
      return NextResponse.json({ ok: true });
    }

    if (!mailbox.is_active) {
      console.log(`[MAILBOX-WEBHOOK] Mailbox suspended: ${recipientEmail}`);
      return NextResponse.json({ ok: true });
    }

    // Basic spam detection
    const isSpam = detectSpam(subject, htmlBody, from);

    // Store the email
    await supabase.from('user_emails').insert({
      mailbox_id: mailbox.id,
      message_id: messageId,
      direction: 'inbound',
      from_address: from,
      from_name: body.from_name || from?.split('@')[0] || '',
      to_address: recipientEmail,
      subject,
      body_html: htmlBody,
      body_text: textBody,
      is_spam: isSpam,
      folder: isSpam ? 'spam' : 'inbox',
    });

    console.log(`[MAILBOX-WEBHOOK] Email received: ${from} → ${recipientEmail} (spam=${isSpam})`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[MAILBOX-WEBHOOK] Error:', err);
    return NextResponse.json({ ok: true }); // Always 200 so Postal doesn't retry
  }
}

function detectSpam(subject: string, body: string, from: string): boolean {
  const spamKeywords = [
    'viagra', 'cialis', 'lottery', 'winner', 'inheritance',
    'nigerian prince', 'click here now', 'act fast', 'limited time',
    'free money', 'bitcoin doubler', 'crypto giveaway',
  ];
  const combined = `${subject} ${body} ${from}`.toLowerCase();
  return spamKeywords.some((kw) => combined.includes(kw));
}
