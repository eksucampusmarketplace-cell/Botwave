/**
 * Telegram Userbot - Request Verification Code
 * 
 * Initiates the phone number verification flow for userbot login.
 * POST /api/telegram/userbot/request-code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { pendingClients } from '@/botwave/platforms/telegram/userbot/pendingAuthStore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneNumber, apiId, apiHash, sessionId } = await request.json();

    if (!phoneNumber || !apiId || !apiHash) {
      return NextResponse.json({
        error: 'Phone number, API ID, and API Hash are required',
      }, { status: 400 });
    }

    const numericApiId = Number(apiId);
    if (isNaN(numericApiId)) {
      return NextResponse.json({ error: 'API ID must be a number' }, { status: 400 });
    }

    try {
      const session = new StringSession('');
      const client = new TelegramClient(session, numericApiId, apiHash, {
        connectionRetries: 3,
      });

      await client.connect();

      const result = await client.invoke(
        new (await import('telegram/tl')).Api.auth.SendCode({
          phoneNumber,
          apiId: numericApiId,
          apiHash,
          settings: new (await import('telegram/tl')).Api.CodeSettings({}),
        }),
      );

      // Store client for verification step
      const storeKey = sessionId || `${user.id}:${phoneNumber}`;
      pendingClients.set(storeKey, {
        client,
        phoneCodeHash: result.phoneCodeHash,
      });

      // Auto-cleanup after 5 minutes
      setTimeout(() => {
        const entry = pendingClients.get(storeKey);
        if (entry) {
          entry.client.disconnect().catch(() => {});
          pendingClients.delete(storeKey);
        }
      }, 300_000);

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your phone',
        storeKey,
      });
    } catch (err: any) {
      console.error('[TG-UB-CODE] Error:', err);

      if (err?.message?.includes('PHONE_NUMBER_INVALID')) {
        return NextResponse.json({
          error: 'Invalid phone number. Use international format (e.g., +234...)',
        }, { status: 400 });
      }
      if (err?.message?.includes('PHONE_NUMBER_FLOOD')) {
        return NextResponse.json({
          error: 'Too many attempts. Please wait and try again later.',
        }, { status: 429 });
      }

      return NextResponse.json({
        error: 'Failed to send verification code. Please try again.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[TG-UB-CODE] Request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
