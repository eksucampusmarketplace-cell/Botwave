/**
 * Telegram Userbot - Verify Code & Complete Login
 * 
 * Completes the phone verification flow and saves the session string.
 * POST /api/telegram/userbot/verify-code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authenticatedUser = await getAuthenticatedUser(supabase);

    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storeKey, code, password } = await request.json();

    if (!storeKey || !code) {
      return NextResponse.json({
        error: 'Store key and verification code are required',
      }, { status: 400 });
    }

    const { pendingClients } = await import('@/botwave/platforms/telegram/userbot/pendingAuthStore');
    const entry = pendingClients.get(storeKey);

    if (!entry) {
      return NextResponse.json({
        error: 'Verification session expired. Please request a new code.',
      }, { status: 400 });
    }

    const { client, phoneCodeHash } = entry;

    try {
      const { Api } = await import('telegram/tl');

      try {
        await client.invoke(
          new Api.auth.SignIn({
            phoneNumber: storeKey.includes(':') ? storeKey.split(':')[1] : '',
            phoneCodeHash,
            phoneCode: code,
          }),
        );
      } catch (err: any) {
        if (err?.message?.includes('SESSION_PASSWORD_NEEDED')) {
          if (!password) {
            return NextResponse.json({
              success: false,
              needs2FA: true,
              message: 'Two-factor authentication is enabled. Please provide your password.',
            });
          }

          // Handle 2FA
          const passwordResult = await client.invoke(new Api.account.GetPassword());
          const { computeCheck } = await import('telegram/Password');
          const srpResult = await computeCheck(passwordResult, password);
          await client.invoke(new Api.auth.CheckPassword({ password: srpResult }));
        } else if (err?.message?.includes('PHONE_CODE_INVALID')) {
          return NextResponse.json({
            error: 'Invalid verification code. Please try again.',
          }, { status: 400 });
        } else if (err?.message?.includes('PHONE_CODE_EXPIRED')) {
          pendingClients.delete(storeKey);
          return NextResponse.json({
            error: 'Verification code expired. Please request a new one.',
          }, { status: 400 });
        } else {
          throw err;
        }
      }

      // Login successful — get session string
      const { StringSession } = await import('telegram/sessions');
      const sessionString = (client.session as InstanceType<typeof StringSession>).save();

      // Clean up pending client
      pendingClients.delete(storeKey);

      return NextResponse.json({
        success: true,
        sessionString,
        message: 'Login successful! Session string saved.',
      });
    } catch (err: any) {
      console.error('[TG-UB-VERIFY] Error:', err);
      return NextResponse.json({
        error: 'Verification failed. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[TG-UB-VERIFY] Request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
