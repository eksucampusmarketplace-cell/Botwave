/**
 * Admin security utilities: login rate limiting, audit logging, IP tracking.
 * Audit log is persisted to Supabase when available, with in-memory fallback.
 */

import { createClient as createServiceClient } from '@supabase/supabase-js';

// ─── Login Rate Limiting ──────────────────────────────────────────────────────

interface LoginAttempt {
  timestamp: number;
  ip: string;
  username: string;
  success: boolean;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10-minute window for counting failures
const MAX_AUDIT_ENTRIES = 200;

const loginAttempts: LoginAttempt[] = [];

function cleanOldAttempts(): void {
  const cutoff = Date.now() - ATTEMPT_WINDOW_MS;
  while (loginAttempts.length > 0 && loginAttempts[0].timestamp < cutoff) {
    loginAttempts.shift();
  }
}

/**
 * Check if an IP is currently locked out from admin login.
 */
export function isLockedOut(ip: string): { locked: boolean; remainingMs: number } {
  cleanOldAttempts();
  const now = Date.now();
  const recentFails = loginAttempts.filter(
    a => a.ip === ip && !a.success && now - a.timestamp < LOCKOUT_DURATION_MS
  );

  if (recentFails.length >= MAX_FAILED_ATTEMPTS) {
    const oldestFail = recentFails[recentFails.length - MAX_FAILED_ATTEMPTS].timestamp;
    const remainingMs = LOCKOUT_DURATION_MS - (now - oldestFail);
    if (remainingMs > 0) {
      return { locked: true, remainingMs };
    }
  }
  return { locked: false, remainingMs: 0 };
}

/**
 * Record a login attempt (success or failure).
 */
export function recordLoginAttempt(ip: string, username: string, success: boolean): void {
  loginAttempts.push({ timestamp: Date.now(), ip, username, success });
  // Cap stored attempts to prevent memory leak
  if (loginAttempts.length > 500) {
    loginAttempts.splice(0, loginAttempts.length - 500);
  }
}

/**
 * Get recent login attempts for the admin security panel.
 */
export function getRecentLoginAttempts(limit = 50): LoginAttempt[] {
  return loginAttempts.slice(-limit).reverse();
}

// ─── Audit Logging (Persistent via Supabase) ─────────────────────────────────

interface AuditEntry {
  timestamp: number;
  admin: string;
  action: string;
  target: string;
  details: string;
  ip: string;
}

const auditLogCache: AuditEntry[] = [];

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key);
}

/**
 * Log an admin action for the audit trail.
 * Persists to Supabase if available, falls back to in-memory.
 */
export function logAdminAction(
  admin: string,
  action: string,
  target: string,
  details: string,
  ip: string,
): void {
  const entry: AuditEntry = { timestamp: Date.now(), admin, action, target, details, ip };
  auditLogCache.push(entry);
  if (auditLogCache.length > MAX_AUDIT_ENTRIES) {
    auditLogCache.splice(0, auditLogCache.length - MAX_AUDIT_ENTRIES);
  }

  const supabase = getServiceSupabase();
  if (supabase) {
    Promise.resolve(
      supabase
        .from('admin_audit_log')
        .insert({
          admin_username: admin,
          action,
          target,
          details,
          ip_address: ip,
        })
    ).catch(() => {});
  }
}

/**
 * Get the audit log for display in admin panel.
 * Reads from Supabase if available, falls back to in-memory cache.
 */
export async function getAuditLogPersisted(limit = 50): Promise<AuditEntry[]> {
  const supabase = getServiceSupabase();
  if (supabase) {
    const { data } = await supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (data && data.length > 0) {
      return data.map(row => ({
        timestamp: new Date(row.created_at).getTime(),
        admin: row.admin_username,
        action: row.action,
        target: row.target,
        details: row.details,
        ip: row.ip_address,
      }));
    }
  }
  return auditLogCache.slice(-limit).reverse();
}

/**
 * Sync getter for backward compatibility.
 */
export function getAuditLog(limit = 50): AuditEntry[] {
  return auditLogCache.slice(-limit).reverse();
}

// ─── IP Extraction ────────────────────────────────────────────────────────────

/**
 * Extract client IP from request headers (handles proxies like Render/Cloudflare).
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}
