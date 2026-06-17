import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_MASTER_SECRET || '';

/**
 * Encrypt a string using AES-256-GCM with a per-user derived key.
 * Returns base64-encoded "iv.authTag.ciphertext" format.
 * If no ENCRYPTION_MASTER_SECRET is set, returns the plain text (graceful degradation).
 */
export function encrypt(text: string, userId: string): string {
  if (!ENCRYPTION_KEY) return text;

  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, userId, 100_000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

/**
 * Decrypt a string encrypted with encrypt().
 * If the string doesn't contain the expected "iv.tag.data" format (i.e. it's
 * plain text from before encryption was enabled), returns it as-is.
 */
export function decrypt(encryptedStr: string, userId: string): string {
  if (!ENCRYPTION_KEY) return encryptedStr;

  const parts = encryptedStr.split('.');
  if (parts.length !== 3) return encryptedStr; // plain text fallback

  try {
    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encryptedData = Buffer.from(dataB64, 'base64');
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, userId, 100_000, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encryptedData) + decipher.final('utf8');
  } catch {
    return encryptedStr; // if decryption fails, assume it's plain text
  }
}

/**
 * Check if a string looks like it was encrypted by our encrypt() function.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  try {
    Buffer.from(parts[0], 'base64');
    Buffer.from(parts[1], 'base64');
    Buffer.from(parts[2], 'base64');
    return true;
  } catch {
    return false;
  }
}
