import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { randomBytes } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

const TOKEN_EXPIRY_MINUTES = 10;

// POST — generate a one-time login token (called by the bot)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone_number, session_id, user_id } = body;

    // Verify the request comes from the bot (internal API key check)
    const authHeader = request.headers.get('x-bot-secret');
    const botSecret = process.env.BOT_INTERNAL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!authHeader || authHeader !== botSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!phone_number) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Invalidate any previous unused tokens for this phone
    await supabase
      .from('study_login_tokens')
      .update({ used: true })
      .eq('phone_number', phone_number)
      .eq('used', false);

    const { error } = await supabase.from('study_login_tokens').insert({
      token,
      phone_number,
      session_id: session_id || null,
      user_id: user_id || null,
      expires_at: expiresAt,
    });

    if (error) {
      console.error('[STUDY-AUTH] Token insert error:', error.message);
      return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';
    const loginUrl = `${appUrl}/study-login?token=${token}`;

    return NextResponse.json({ success: true, token, login_url: loginUrl });
  } catch (err) {
    console.error('[STUDY-AUTH] Exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET — validate token and create session (called by the study-login page)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Find and validate the token
    const { data: tokenRow, error: tokenError } = await supabase
      .from('study_login_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !tokenRow) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Check expiry
    if (new Date(tokenRow.expires_at) < new Date()) {
      await supabase.from('study_login_tokens').update({ used: true }).eq('id', tokenRow.id);
      return NextResponse.json({ error: 'Token has expired' }, { status: 401 });
    }

    // Mark token as used
    await supabase.from('study_login_tokens').update({ used: true, used_at: new Date().toISOString() }).eq('id', tokenRow.id);

    // Find or create user for this phone number
    const phone = tokenRow.phone_number;
    const studyEmail = `study_${phone.replace(/\+/g, '')}@botwave.local`;

    // Check if a study user already exists by looking up their profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', `study_${phone.replace(/\+/g, '')}`)
      .single();

    let userId: string;
    let userPassword: string;

    if (existingProfile) {
      userId = existingProfile.id;
      // Reset password to a fresh random one for this login
      userPassword = randomBytes(16).toString('hex');
      await supabase.auth.admin.updateUserById(userId, { password: userPassword });
    } else {
      // Create a new study-only user
      userPassword = randomBytes(16).toString('hex');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: studyEmail,
        password: userPassword,
        user_metadata: {
          username: `study_${phone.replace(/\+/g, '')}`,
          phone_number: phone,
          is_study_user: true,
        },
        email_confirm: true,
      });

      if (createError || !newUser?.user) {
        console.error('[STUDY-AUTH] User create error:', createError?.message);
        return NextResponse.json({ error: 'Failed to create study account' }, { status: 500 });
      }

      userId = newUser.user.id;

      // Create profile
      await supabase.from('profiles').upsert({
        id: userId,
        username: `study_${phone.replace(/\+/g, '')}`,
      }, { onConflict: 'id' });
    }

    // Sign in and set session cookies
    const response = NextResponse.json({
      success: true,
      redirect: '/dashboard/study',
    });

    const supabaseWithCookies = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      },
    );

    const { error: signInError } = await supabaseWithCookies.auth.signInWithPassword({
      email: studyEmail,
      password: userPassword,
    });

    if (signInError) {
      console.error('[STUDY-AUTH] Sign-in error:', signInError.message);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }

    return response;
  } catch (err) {
    console.error('[STUDY-AUTH] Validate exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
