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

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminClient();

    // Get all mailboxes for this user
    let { data: mailboxes } = await supabase
      .from('user_mailboxes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!mailboxes || mailboxes.length === 0) {
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
      const emailAddress = `${username}@mail.botwave.online`;

      const { data: newMailbox, error } = await supabase
        .from('user_mailboxes')
        .insert({
          user_id: user.id,
          email_address: emailAddress,
          display_name: username,
          label: 'Primary',
        })
        .select()
        .single();

      if (error) {
        console.error('[MAILBOX] Create error:', error);
        return NextResponse.json({ error: 'Failed to create mailbox' }, { status: 500 });
      }
      mailboxes = [newMailbox];
    }

    // Determine which mailbox to show
    const url = new URL(request.url);
    const mailboxId = url.searchParams.get('mailboxId') || mailboxes[0].id;
    const activeMailbox = mailboxes.find((m) => m.id === mailboxId) || mailboxes[0];

    const folder = url.searchParams.get('folder') || 'inbox';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data: emails, count } = await supabase
      .from('user_emails')
      .select('*', { count: 'exact' })
      .eq('mailbox_id', activeMailbox.id)
      .eq('folder', folder)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { count: unreadCount } = await supabase
      .from('user_emails')
      .select('*', { count: 'exact', head: true })
      .eq('mailbox_id', activeMailbox.id)
      .eq('folder', 'inbox')
      .eq('is_read', false);

    // Get profile to check max_mailboxes
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, max_mailboxes')
      .eq('id', user.id)
      .single();

    const maxMailboxes = profile?.max_mailboxes || 1;
    const canCreateMore = mailboxes.length < maxMailboxes;

    return NextResponse.json({
      success: true,
      data: {
        mailbox: {
          id: activeMailbox.id,
          email: activeMailbox.email_address,
          displayName: activeMailbox.display_name,
          label: activeMailbox.label || 'Primary',
          isActive: activeMailbox.is_active,
          dailySendCount: activeMailbox.daily_send_count,
          dailySendLimit: activeMailbox.daily_send_limit,
        },
        allMailboxes: mailboxes.map((m) => ({
          id: m.id,
          email: m.email_address,
          label: m.label || 'Primary',
          isActive: m.is_active,
        })),
        canCreateMore,
        maxMailboxes,
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

/** POST: Create a new mailbox address */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminClient();

    // Check max_mailboxes from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, max_mailboxes')
      .eq('id', user.id)
      .single();

    const maxMailboxes = profile?.max_mailboxes || 1;

    const { count: currentCount } = await supabase
      .from('user_mailboxes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((currentCount || 0) >= maxMailboxes) {
      return NextResponse.json(
        { error: `You can have up to ${maxMailboxes} email addresses` },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { localPart, label } = body;

    if (!localPart || typeof localPart !== 'string') {
      return NextResponse.json({ error: 'localPart is required' }, { status: 400 });
    }

    // Validate local part: alphanumeric, dots, hyphens, underscores only
    const sanitized = localPart.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (sanitized.length < 2 || sanitized.length > 30) {
      return NextResponse.json({ error: 'Address must be 2-30 characters (letters, numbers, dots, hyphens)' }, { status: 400 });
    }

    const emailAddress = `${sanitized}@mail.botwave.online`;

    // Check uniqueness
    const { data: existing } = await supabase
      .from('user_mailboxes')
      .select('id')
      .eq('email_address', emailAddress)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'This email address is already taken' }, { status: 409 });
    }

    const { data: newMailbox, error } = await supabase
      .from('user_mailboxes')
      .insert({
        user_id: user.id,
        email_address: emailAddress,
        display_name: sanitized,
        label: label || sanitized,
      })
      .select()
      .single();

    if (error) {
      console.error('[MAILBOX] Create new address error:', error);
      return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
    }

    console.log(`[MAILBOX] New address created: ${emailAddress} for user ${user.id}`);
    return NextResponse.json({
      success: true,
      mailbox: {
        id: newMailbox.id,
        email: newMailbox.email_address,
        label: newMailbox.label,
        isActive: newMailbox.is_active,
      },
    });
  } catch (err) {
    console.error('[MAILBOX] POST error:', err);
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
    const { emailId, action, mailboxId } = body;

    if (!emailId || !action) {
      return NextResponse.json({ error: 'emailId and action required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Verify ownership — check the specified mailbox or any owned mailbox
    const ownershipQuery = supabase
      .from('user_mailboxes')
      .select('id')
      .eq('user_id', user.id);

    if (mailboxId) {
      ownershipQuery.eq('id', mailboxId);
    }

    const { data: ownedMailboxes } = await ownershipQuery;
    if (!ownedMailboxes || ownedMailboxes.length === 0) {
      return NextResponse.json({ error: 'No mailbox found' }, { status: 404 });
    }

    const ownedIds = ownedMailboxes.map((m) => m.id);

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
      .in('mailbox_id', ownedIds);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[MAILBOX] PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
