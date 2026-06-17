import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/community-commands - list approved community commands
export async function GET(request: NextRequest) {
  try {
    const admin = await createAdminClient();
    const category = request.nextUrl.searchParams.get('category');
    const sort = request.nextUrl.searchParams.get('sort') || 'likes';

    let query = admin
      .from('community_commands')
      .select('*')
      .eq('status', 'approved');

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('likes', { ascending: false });
    }

    const { data, error } = await query.limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, commands: data || [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/community-commands - submit a new community command
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Please log in to submit a command' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, platform, category, commands, setupInstructions, authorName } = body;

    if (!title || !description || !platform || !category || !commands || !setupInstructions) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (title.length > 100) {
      return NextResponse.json({ error: 'Title must be under 100 characters' }, { status: 400 });
    }

    if (description.length > 500) {
      return NextResponse.json({ error: 'Description must be under 500 characters' }, { status: 400 });
    }

    const commandList = Array.isArray(commands)
      ? commands
      : commands.split('\n').map((c: string) => c.trim()).filter(Boolean);

    if (commandList.length === 0 || commandList.length > 10) {
      return NextResponse.json({ error: 'Please provide 1-10 commands' }, { status: 400 });
    }

    const admin = await createAdminClient();
    const { data, error } = await admin
      .from('community_commands')
      .insert({
        title: title.trim(),
        description: description.trim(),
        author_name: (authorName || user.email?.split('@')[0] || 'Anonymous').trim(),
        author_user_id: user.id,
        platform,
        category,
        commands: commandList,
        setup_instructions: setupInstructions.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Your command has been submitted for review! We will review it within 48 hours.',
      command: data,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
