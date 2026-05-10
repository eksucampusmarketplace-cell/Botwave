import { NextResponse, type NextRequest } from 'next/server';
import { isLockedOut, recordLoginAttempt, getClientIp } from '@/lib/admin-security';
import { generateCode, storeVerificationCode, checkRateLimit } from '@/lib/email/verification-store';
import { sendForgotPasswordEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request.headers);

    const lockout = isLockedOut(clientIp);
    if (lockout.locked) {
      const remainingMin = Math.ceil(lockout.remainingMs / 60_000);
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${remainingMin} minute(s).` },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 },
      );
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // If username was provided, look up the email
    let resetEmail = email;
    if (!email.includes('@')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', email)
        .single();

      if (profile) {
        const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
        if (userData?.user?.email) {
          resetEmail = userData.user.email;
        }
      }
    }

    // Look up username for the email template
    let username = resetEmail.split('@')[0];
    if (resetEmail.includes('@')) {
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users?.users?.find((u) => u.email?.toLowerCase() === resetEmail.toLowerCase());
      if (user?.user_metadata?.username) {
        username = user.user_metadata.username;
      }
    }

    // Generate a password reset link via Supabase
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: resetEmail,
      options: {
        redirectTo: `${appUrl}/reset-password`,
      },
    });

    if (linkData?.properties?.action_link) {
      // Send reset email via Postal (our own email system)
      try {
        await sendForgotPasswordEmail(resetEmail, linkData.properties.action_link, username);
      } catch (emailErr) {
        console.error('[AUTH] Forgot password email failed:', emailErr);
        // Fallback to Supabase built-in email
        const { createClient: createAnonClient } = await import('@supabase/supabase-js');
        const anonSupabase = createAnonClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        await anonSupabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: `${appUrl}/reset-password`,
        });
      }
    } else {
      // Fallback if link generation fails
      if (linkError) {
        console.error('[AUTH] Generate link error:', linkError.message);
      }
      const { createClient: createAnonClient } = await import('@supabase/supabase-js');
      const anonSupabase = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      await anonSupabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${appUrl}/reset-password`,
      });
    }

    // Always return success to avoid email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('[AUTH] Forgot password exception:', err);
    return NextResponse.json(
      { error: 'Server error. Please try again.' },
      { status: 500 },
    );
  }
}
