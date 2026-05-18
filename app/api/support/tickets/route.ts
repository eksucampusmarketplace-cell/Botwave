import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/support/tickets - list user's tickets with latest message
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = request.nextUrl.searchParams.get('ticketId');

    const admin = await createAdminClient();

    // If ticketId provided, return that ticket's messages
    if (ticketId) {
      const { data: ticket } = await admin
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .eq('user_id', user.id)
        .single();

      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      const { data: messages } = await admin
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      return NextResponse.json({
        success: true,
        data: { ticket, messages: messages || [] },
      });
    }

    // List all tickets for this user
    const { data: tickets } = await admin
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    return NextResponse.json({ success: true, data: tickets || [] });
  } catch (error) {
    console.error('Support tickets GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/support/tickets - create ticket or send message
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const admin = await createAdminClient();

    // Send message to existing ticket
    if (body.ticketId) {
      // Verify ticket belongs to user
      const { data: ticket } = await admin
        .from('support_tickets')
        .select('id')
        .eq('id', body.ticketId)
        .eq('user_id', user.id)
        .single();

      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      const { data: msg, error: msgErr } = await admin
        .from('support_messages')
        .insert({
          ticket_id: body.ticketId,
          sender_type: 'user',
          sender_id: user.id,
          message: body.message,
        })
        .select()
        .single();

      if (msgErr) throw msgErr;

      // Reopen ticket if it was resolved/closed
      await admin
        .from('support_tickets')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('id', body.ticketId)
        .in('status', ['resolved', 'closed']);

      return NextResponse.json({ success: true, data: msg });
    }

    // Create new ticket
    if (!body.subject || !body.message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const { data: ticket, error: ticketErr } = await admin
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: body.subject,
        priority: body.priority || 'normal',
      })
      .select()
      .single();

    if (ticketErr) throw ticketErr;

    const { error: msgErr } = await admin
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        sender_type: 'user',
        sender_id: user.id,
        message: body.message,
      });

    if (msgErr) throw msgErr;

    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Support tickets POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
