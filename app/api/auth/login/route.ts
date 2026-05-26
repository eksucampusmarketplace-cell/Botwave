import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isLockedOut, recordLoginAttempt, getClientIp } from '@/lib/admin-security';
import { getCachedProfileId, cacheProfileId } from '@/lib/redisApiCache';

function getInternalSupabaseUrl(): string {
  return process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

function getCookieSupabaseUrl(request: NextRequest): string {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const internalUrl = process.env.SUPABASE_INTERNAL_URL;

  if (!internalUrl) return publicUrl;

  try {
    const publicHost = new URL(publicUrl).hostname;
    return publicHost === request.nextUrl.hostname ? internalUrl : publicUrl;
  } catch {
    return publicUrl;
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request.headers);

    // Brute-force protection
    const lockout = isLockedOut(clientIp);
    if (lockout.locked) {
      const remainingMin = Math.ceil(lockout.remainingMs / 60_000);
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${remainingMin} minute(s).` },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    const response = NextResponse.json({ message: 'Login successful' });

    const supabase = createServerClient(
      getCookieSupabaseUrl(request),
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

    // Check if input is email or username
    let loginEmail = email;
    if (!email.includes('@')) {
      const { createClient } = await import('@supabase/supabase-js');
      const adminSupabase = createClient(
        getInternalSupabaseUrl(),
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      // Try Redis cache first for username→id lookup
      let profileId = await getCachedProfileId(email);
      if (!profileId) {
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('id')
          .eq('username', email)
          .single();

        if (!profile) {
          recordLoginAttempt(clientIp, email, false);
          return NextResponse.json(
            { error: 'Invalid email/username or password' },
            { status: 401 },
          );
        }
        profileId = profile.id as string;
        await cacheProfileId(email, profileId);
      }

      const { data: userData } = await adminSupabase.auth.admin.getUserById(profileId);
      if (!userData?.user?.email) {
        recordLoginAttempt(clientIp, email, false);
        return NextResponse.json(
          { error: 'Invalid email/username or password' },
          { status: 401 },
        );
      }
      loginEmail = userData.user.email;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      recordLoginAttempt(clientIp, email, false);
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: 'Invalid email/username or password' },
          { status: 401 },
        );
      }
      console.error('[AUTH] Login error:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 401 },
      );
    }

    recordLoginAttempt(clientIp, email, true);

    // Track login for acquisition analytics (best-effort, non-blocking)
    try {
      const { data: { user: loggedInUser } } = await supabase.auth.getUser();
      if (loggedInUser) {
        const { createClient } = await import('@supabase/supabase-js');
        const adminSupabase = createClient(
          getInternalSupabaseUrl(),
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );
        const { error: rpcErr } = await adminSupabase.rpc('increment_login_count', { p_user_id: loggedInUser.id });
        if (rpcErr) {
          // Fallback if RPC doesn't exist yet
          await adminSupabase
            .from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', loggedInUser.id);
        }
      }
    } catch {
      // Non-critical - don't block login
    }

    return response;
  } catch (err) {
    console.error('[AUTH] Login exception:', err);
    return NextResponse.json(
      { error: 'Server error. Please try again.' },
      { status: 500 },
    );
  }
}
