/**
 * Email Unsubscribe Handler
 * GET  /api/email/unsubscribe?token=<base64url email> - Shows confirmation page
 * POST /api/email/unsubscribe?token=<base64url email> - Processes unsubscribe (one-click)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function getServiceClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const HMAC_SECRET = process.env.UNSUBSCRIBE_HMAC_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret';

/** Generate HMAC signature for an email address. */
function signEmail(email: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(email.toLowerCase()).digest('hex').slice(0, 16);
}

/** Create a signed unsubscribe token: base64url(email).signature */
export function createUnsubscribeToken(email: string): string {
  const encoded = Buffer.from(email.toLowerCase(), 'utf-8').toString('base64url');
  return `${encoded}.${signEmail(email)}`;
}

/**
 * Decode and verify an unsubscribe token.
 * Supports both legacy (unsigned base64url) and new (signed) tokens.
 */
function decodeToken(token: string): string | null {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx > 0) {
      const encoded = token.slice(0, dotIdx);
      const sig = token.slice(dotIdx + 1);
      const email = Buffer.from(encoded, 'base64url').toString('utf-8');
      if (signEmail(email) === sig) return email;
      return null; // signature mismatch
    }
    // Legacy unsigned token — accept but log warning
    const email = Buffer.from(token, 'base64url').toString('utf-8');
    if (email && email.includes('@')) {
      console.warn('[UNSUB] Legacy unsigned token used — consider re-generating links');
      return email;
    }
    return null;
  } catch {
    return null;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return new NextResponse('Invalid unsubscribe link.', { status: 400 });
  }

  const email = decodeToken(token);
  if (!email || !email.includes('@')) {
    return new NextResponse('Invalid unsubscribe link.', { status: 400 });
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Unsubscribe - BotWave</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f1f5f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
  .card { background: #1e293b; border-radius: 12px; padding: 40px; max-width: 400px; text-align: center; border: 1px solid #334155; }
  h1 { font-size: 24px; margin: 0 0 16px; }
  p { color: #94a3b8; margin: 8px 0 24px; }
  form button { background: #ef4444; color: white; border: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; cursor: pointer; }
  form button:hover { background: #dc2626; }
  .email { color: #60a5fa; }
</style>
</head>
<body>
  <div class="card">
    <h1>Unsubscribe</h1>
    <p>Click below to unsubscribe <span class="email">${escapeHtml(email)}</span> from BotWave emails.</p>
    <form method="POST">
      <input type="hidden" name="token" value="${token}">
      <button type="submit">Unsubscribe</button>
    </form>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

export async function POST(req: NextRequest) {
  // Support both query param and form body
  let token = req.nextUrl.searchParams.get('token');
  if (!token) {
    try {
      const formData = await req.formData();
      token = formData.get('token') as string;
    } catch {
      try {
        const body = await req.json();
        token = body.token;
      } catch {}
    }
  }

  if (!token) {
    return new NextResponse('Invalid request.', { status: 400 });
  }

  const email = decodeToken(token);
  if (!email || !email.includes('@')) {
    return new NextResponse('Invalid unsubscribe link.', { status: 400 });
  }

  const supabase = getServiceClient();
  await supabase.from('email_unsubscribes').upsert(
    { email: email.toLowerCase(), reason: 'one-click' },
    { onConflict: 'email' },
  );

  console.log(`[UNSUB] ${email} unsubscribed via one-click`);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Unsubscribed - BotWave</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f1f5f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
  .card { background: #1e293b; border-radius: 12px; padding: 40px; max-width: 400px; text-align: center; border: 1px solid #334155; }
  h1 { font-size: 24px; margin: 0 0 16px; }
  p { color: #94a3b8; }
</style>
</head>
<body>
  <div class="card">
    <h1>Unsubscribed</h1>
    <p>You have been successfully unsubscribed from BotWave emails.</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
