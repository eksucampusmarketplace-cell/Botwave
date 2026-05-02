import crypto from 'crypto';

// Store active admin tokens in memory with expiry
const adminTokens: Map<string, { expiresAt: number; username: string }> = new Map();
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store an admin token with expiry
 */
export function storeAdminToken(token: string, username: string): void {
  const expiresAt = Date.now() + TOKEN_EXPIRY_MS;
  adminTokens.set(token, { expiresAt, username });
}

/**
 * Validate an admin token and return the associated data if valid
 */
export function validateAdminToken(token: string): { username: string } | null {
  cleanupExpiredTokens();
  
  const tokenData = adminTokens.get(token);
  if (!tokenData) {
    return null;
  }
  
  if (Date.now() > tokenData.expiresAt) {
    adminTokens.delete(token);
    return null;
  }
  
  return { username: tokenData.username };
}

/**
 * Revoke (delete) an admin token
 */
export function revokeAdminToken(token: string): boolean {
  return adminTokens.delete(token);
}

/**
 * Clean up expired tokens from memory
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  const tokensToDelete: string[] = [];
  adminTokens.forEach((data, token) => {
    if (now > data.expiresAt) {
      tokensToDelete.push(token);
    }
  });
  tokensToDelete.forEach(token => adminTokens.delete(token));
}

/**
 * Verify admin token from cookie value - returns username or null
 */
export function verifyAdminToken(tokenValue: string | undefined): { username: string } | null {
  if (!tokenValue) {
    return null;
  }
  return validateAdminToken(tokenValue);
}