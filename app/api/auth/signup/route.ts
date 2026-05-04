import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, username } = body;

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, password, and username are required' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    // Validate username format (alphanumeric + underscores, 3-30 chars)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-30 characters (letters, numbers, underscores only)' },
        { status: 400 },
      );
    }

    const supabase = await createAdminClient();

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 },
      );
    }

    // Create user via Supabase Auth (admin client to bypass email confirmation if needed)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      email_confirm: true,
    });

    if (error) {
      // Handle common Supabase auth errors with user-friendly messages
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 },
        );
      }
      if (error.message.includes('invalid') && error.message.includes('email')) {
        return NextResponse.json(
          { error: 'Please enter a valid email address' },
          { status: 400 },
        );
      }
      console.error('[AUTH] Signup error:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: 'Account created successfully', user: { id: data.user?.id, email: data.user?.email } },
      { status: 201 },
    );
  } catch (err) {
    console.error('[AUTH] Signup exception:', err);
    return NextResponse.json(
      { error: 'Server error. Please try again.' },
      { status: 500 },
    );
  }
}
