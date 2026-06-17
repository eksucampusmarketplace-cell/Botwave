/**
 * Environment loader — Replit edition.
 * All env vars come from process.env via Replit Secrets. No @next/env needed.
 */
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[ENV] Warning: ${key} is not set. Some features may not work.`);
  }
}
if (!process.env.BOT_PLATFORM) {
  process.env.BOT_PLATFORM = 'telegram';
}
