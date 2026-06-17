import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { sendSupportReplyEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET /api/admin/support - list all tickets with last message preview
export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = request.nextUrl.searchParams.get('ticketId');
    const statusFilter = request.nextUrl.searchParams.get('status');
    const supabase = await createAdminClient();

    // If ticketId provided, return that ticket's full thread
    if (ticketId) {
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      // Get user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', ticket.user_id)
        .single();

      const { data: messages } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      return NextResponse.json({
        success: true,
        data: {
          ticket: { ...ticket, username: profile?.username || 'Unknown' },
          messages: messages || [],
        },
      });
    }

    // List all tickets
    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: tickets } = await query;

    // Get usernames for all tickets
    const userIds = [...new Set((tickets || []).map(t => t.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p.username]));

    // Get last message for each ticket
    const ticketIds = (tickets || []).map(t => t.id);
    const { data: allMessages } = await supabase
      .from('support_messages')
      .select('*')
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: false });

    const lastMessageMap = new Map<string, { message: string; sender_type: string; created_at: string }>();
    for (const msg of allMessages || []) {
      if (!lastMessageMap.has(msg.ticket_id)) {
        lastMessageMap.set(msg.ticket_id, {
          message: msg.message,
          sender_type: msg.sender_type,
          created_at: msg.created_at,
        });
      }
    }

    // Count unread (messages from users after last admin reply)
    const enrichedTickets = (tickets || []).map(t => ({
      ...t,
      username: profileMap.get(t.user_id) || 'Unknown',
      last_message: lastMessageMap.get(t.id) || null,
    }));

    // Count stats
    const allTickets = tickets || [];
    const stats = {
      total: allTickets.length,
      open: allTickets.filter(t => t.status === 'open').length,
      in_progress: allTickets.filter(t => t.status === 'in_progress').length,
      resolved: allTickets.filter(t => t.status === 'resolved').length,
    };

    return NextResponse.json({ success: true, data: enrichedTickets, stats });
  } catch (error) {
    console.error('Admin support GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/admin/support - admin reply or update ticket
export async function POST(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = await createAdminClient();

    // Reply to ticket
    if (body.ticketId && body.message) {
      const { data: msg, error: msgErr } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: body.ticketId,
          sender_type: 'admin',
          sender_id: tokenValidation.username,
          message: body.message,
        })
        .select()
        .single();

      if (msgErr) throw msgErr;

      // Auto-set to in_progress if was open
      await supabase
        .from('support_tickets')
        .update({
          status: body.status || 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.ticketId);

      // Send email notification to the user (fire-and-forget)
      try {
        const { data: ticket } = await supabase
          .from('support_tickets')
          .select('user_id, subject')
          .eq('id', body.ticketId)
          .single();

        if (ticket) {
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(ticket.user_id);
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', ticket.user_id)
            .single();

          if (authUser?.email) {
            sendSupportReplyEmail(
              authUser.email,
              profile?.username || 'User',
              ticket.subject || 'Support Ticket',
              body.message,
            ).catch(err => console.error('[SUPPORT] Failed to send reply notification:', err));
          }
        }
      } catch (emailErr) {
        console.error('[SUPPORT] Email notification error:', emailErr);
      }

      return NextResponse.json({ success: true, data: msg });
    }

    // Update ticket status/priority only
    if (body.ticketId && (body.status || body.priority)) {
      const updates: Record<string, string> = { updated_at: new Date().toISOString() };
      if (body.status) updates.status = body.status;
      if (body.priority) updates.priority = body.priority;

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', body.ticketId);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Admin support POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
