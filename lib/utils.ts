import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

export function formatJid(phone: string, isGroup = false): string {
  if (isGroup) {
    return `${phone}@g.us`;
  }
  return `${sanitizePhoneNumber(phone)}@s.whatsapp.net`;
}

export function extractPhoneFromJid(jid: string): string {
  return jid.split('@')[0];
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

export const messageRateLimiter = new RateLimiter(60000, 20);
export const commandRateLimiter = new RateLimiter(60000, 30);
export const downloadRateLimiter = new RateLimiter(60000, 10);
