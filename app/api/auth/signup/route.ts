import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { generateCode, storeVerificationCode, checkRateLimit, storePendingSignup } from '@/lib/email/verification-store';
import { sendVerificationEmail } from '@/lib/email';

// IP-based rate limiting: max 5 signups per IP per 15 minutes
const ipAttempts = new Map<string, { count: number; resetAt: number }>();
const IP_RATE_LIMIT = 5;
const IP_RATE_WINDOW_MS = 15 * 60 * 1000;

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipAttempts.get(ip);
  if (!record || now > record.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + IP_RATE_WINDOW_MS });
    return true;
  }
  if (record.count >= IP_RATE_LIMIT) return false;
  record.count++;
  return true;
}

// Periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipAttempts) {
      if (now > record.resetAt) ipAttempts.delete(ip);
    }
  }, 60_000);
}

export async function POST(request: NextRequest) {
  try {
    // IP-based rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkIpRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 },
      );
    }

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
