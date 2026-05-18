import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/** Internal Supabase URL for admin/service-role operations (no cookies). */
export function getInternalSupabaseUrl(): string {
  return process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

export async function createClient() {
  const cookieStore = await cookies();

  // MUST use NEXT_PUBLIC_SUPABASE_URL here because @supabase/ssr derives the
  // cookie name from the URL hostname. The browser sets "sb-144-auth-token"
  // (from the public URL). Using SUPABASE_INTERNAL_URL would look for
  // "sb-supabase-kong-auth-token" which doesn't exist → always unauthorized.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return createServerClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function createAdminClient() {
  return createSupabaseClient(
    getInternalSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Get the authenticated user with fallback to getSession().
 *
 * getUser() validates the JWT by calling GoTRUE's /user endpoint.
 * If GoTRUE's token refresh is broken (e.g. oauth_client_id schema mismatch),
 * getUser() returns null even though the JWT is still valid.
 * In that case we fall back to getSession() which validates the JWT locally.
 */
export async function getAuthenticatedUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}
