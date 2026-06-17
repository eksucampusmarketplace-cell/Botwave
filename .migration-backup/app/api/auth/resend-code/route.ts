import { NextResponse, type NextRequest } from 'next/server';
import { generateCode, storeVerificationCode, checkRateLimit, getPendingSignup } from '@/lib/email/verification-store';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const pending = await getPendingSignup(email);
    if (!pending) {
      return NextResponse.json(
        { error: 'No pending signup found. Please start over.' },
        { status: 400 },
      );
    }

    const canSend = await checkRateLimit(email);
    if (!canSend) {
      return NextResponse.json(
        { error: 'Please wait 60 seconds before requesting another code' },
        { status: 429 },
      );
    }

    const code = generateCode();
    await storeVerificationCode(email, code);

    await sendVerificationEmail(email, code, pending.username);

    return NextResponse.json({ message: 'New verification code sent' });
  } catch (err) {
    console.error('[AUTH] Resend code exception:', err);
    return NextResponse.json(
      { error: 'Failed to resend code. Please try again.' },
      { status: 500 },
    );
  }
}
