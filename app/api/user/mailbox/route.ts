import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get or create mailbox
    let { data: mailbox } = await supabase
      .from('user_mailboxes')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!mailbox) {
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
      const emailAddress = `${username}@mail.botwave.online`;

      const { data: newMailbox, error } = await supabase
        .from('user_mailboxes')
        .insert({
          user_id: user.id,
          email_address: emailAddress,
          display_name: username,
        })
        .select()
        .single();

      if (error) {
        console.error('[MAILBOX] Create error:', error);
        return NextResponse.json({ error: 'Failed to create mailbox' }, { status: 500 });
      }
      mailbox = newMailbox;
    }

    // Get emails for the folder
    const url = new URL(request.url);
    const folder = url.searchParams.get('folder') || 'inbox';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data: emails, count } = await supabase
      .from('user_emails')
      .select('*', { count: 'exact' })
      .eq('mailbox_id', mailbox.id)
      .eq('folder', folder)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Unread count
    const { count: unreadCount } = await supabase
      .from('user_emails')
      .select('*', { count: 'exact', head: true })
      .eq('mailbox_id', mailbox.id)
      .eq('folder', 'inbox')
      .eq('is_read', false);

    return NextResponse.json({
      success: true,
      data: {
        mailbox: {
          id: mailbox.id,
          email: mailbox.email_address,
          displayName: mailbox.display_name,
          isActive: mailbox.is_active,
          dailySendCount: mailbox.daily_send_count,
          dailySendLimit: mailbox.daily_send_limit,
        },
        emails: emails || [],
        total: count || 0,
        page,
        unreadCount: unreadCount || 0,
      },
    });
  } catch (err) {
    console.error('[MAILBOX] GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailId, action } = body;

    if (!emailId || !action) {
      return NextResponse.json({ error: 'emailId and action required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify ownership
    const { data: mailbox } = await supabase
      .from('user_mailboxes')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!mailbox) {
      return NextResponse.json({ error: 'No mailbox found' }, { status: 404 });
    }

    const updates: Record<string, boolean | string> = {};
    switch (action) {
      case 'read': updates.is_read = true; break;
      case 'unread': updates.is_read = false; break;
      case 'star': updates.is_starred = true; break;
      case 'unstar': updates.is_starred = false; break;
      case 'trash': updates.folder = 'trash'; break;
      case 'spam': updates.folder = 'spam'; updates.is_spam = true; break;
      case 'restore': updates.folder = 'inbox'; updates.is_spam = false; break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await supabase
      .from('user_emails')
      .update(updates)
      .eq('id', emailId)
      .eq('mailbox_id', mailbox.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[MAILBOX] PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
