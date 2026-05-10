import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { generateCode, storeVerificationCode, checkRateLimit, storePendingSignup } from '@/lib/email/verification-store';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, username, referralCode, signup_source, signup_referrer, utm_source, utm_medium, utm_campaign } = body;

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

    // Rate limit: 1 code per 60s per email
    const canSend = await checkRateLimit(email);
    if (!canSend) {
      return NextResponse.json(
        { error: 'Please wait 60 seconds before requesting another code' },
        { status: 429 },
      );
    }

    // Check if email is already registered and confirmed
    const { data: existingAuth } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingAuth) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    // Generate verification code and store it
    const code = generateCode();
    await storeVerificationCode(email, code);

    // Store pending signup data for the verify step
    await storePendingSignup(email, {
      email, password, username, referralCode,
      signup_source: referralCode ? 'referral' : (signup_source || 'direct'),
      signup_referrer: signup_referrer || undefined,
      utm_source: utm_source || undefined,
      utm_medium: utm_medium || undefined,
      utm_campaign: utm_campaign || undefined,
    });

    // Send verification email via Postal
    try {
      await sendVerificationEmail(email, code, username);
    } catch (emailErr) {
      console.error('[AUTH] Failed to send verification email:', emailErr);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 },
      );
    }

    console.log(`[AUTH] Verification code sent to ${email} for user ${username}`);

    return NextResponse.json({
      message: 'Verification code sent to your email',
      requiresVerification: true,
    });
  } catch (err) {
    console.error('[AUTH] Signup exception:', err);
    return NextResponse.json(
      { error: 'Server error. Please try again.' },
      { status: 500 },
    );
  }
}
