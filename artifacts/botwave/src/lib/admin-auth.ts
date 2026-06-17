const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSigningSecret(): string {
  return process.env.INTERNAL_SECRET || process.env.BOT_SECRET_KEY || 'botwave-admin-fallback-key';
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const bytes = new Uint8Array(sig);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate an HMAC-signed admin token embedding username + expiry.
 * Uses Web Crypto API - works in both Edge Runtime and Node.js.
 */
export async function generateSecureToken(username: string): Promise<string> {
  const expiresAt = Date.now() + TOKEN_EXPIRY_MS;
  const payload = JSON.stringify({ u: username, exp: expiresAt });
  const payloadB64 = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const signature = await hmacSign(payloadB64, getSigningSecret());
  return `${payloadB64}.${signature}`;
}

/**
 * No-op - tokens are now self-verifying via HMAC signature.
 * Kept for API compatibility with the login route.
 */
export function storeAdminToken(_token: string, _username: string): void {
  // Intentionally empty: HMAC tokens don't need server-side storage
}

/**
 * Validate an admin token by verifying its HMAC signature and expiry.
 */
export async function validateAdminToken(token: string): Promise<{ username: string } | null> {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return null;

  const payloadB64 = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  const expectedSignature = await hmacSign(payloadB64, getSigningSecret());
  if (signature.length !== expectedSignature.length) return null;
  // Timing-safe comparison to prevent timing attacks
  let diff = 0;
  for (let i = 0; i < signature.length; i++) {
    diff |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  if (diff !== 0) return null;

  try {
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    if (typeof payload.u !== 'string' || !payload.u) return null;
    return { username: payload.u };
  } catch {
    return null;
  }
}

/**
 * No-op - HMAC tokens cannot be individually revoked without a blacklist.
 * Logout clears the cookie, which is sufficient.
 */
export function revokeAdminToken(_token: string): boolean {
  return true;
}

/**
 * Verify admin token from cookie value - returns username or null
 */
export async function verifyAdminToken(tokenValue: string | undefined): Promise<{ username: string } | null> {
  if (!tokenValue) return null;
  return validateAdminToken(tokenValue);
}
