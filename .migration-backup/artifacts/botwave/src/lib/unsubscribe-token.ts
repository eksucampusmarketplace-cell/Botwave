/**
 * HMAC-signed unsubscribe token utilities.
 * Separated from the route file because Next.js route files
 * cannot export non-route-handler functions.
 */

import crypto from 'crypto';

const HMAC_SECRET = process.env.UNSUBSCRIBE_HMAC_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret';

/** Generate HMAC signature for an email address. */
export function signEmail(email: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(email.toLowerCase()).digest('hex').slice(0, 16);
}

/** Create a signed unsubscribe token: base64url(email).signature */
export function createUnsubscribeToken(email: string): string {
  const encoded = Buffer.from(email.toLowerCase(), 'utf-8').toString('base64url');
  return `${encoded}.${signEmail(email)}`;
}

/**
 * Verify an unsubscribe token.
 * Supports both new HMAC-signed tokens and legacy base64-only tokens.
 * Returns the email if valid, null otherwise.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  // New format: base64url(email).hmac_signature
  if (token.includes('.')) {
    const [encoded, sig] = token.split('.', 2);
    if (!encoded || !sig) return null;
    try {
      const email = Buffer.from(encoded, 'base64url').toString('utf-8');
      if (!email || !email.includes('@')) return null;
      const expectedSig = signEmail(email);
      // Timing-safe comparison
      if (sig.length !== expectedSig.length) return null;
      let diff = 0;
      for (let i = 0; i < sig.length; i++) {
        diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
      }
      return diff === 0 ? email : null;
    } catch {
      return null;
    }
  }

  // Legacy format: plain base64url(email) — backward compatible
  try {
    const email = Buffer.from(token, 'base64url').toString('utf-8');
    if (!email || !email.includes('@')) return null;
    return email;
  } catch {
    return null;
  }
}
