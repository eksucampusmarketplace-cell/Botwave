import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function getCookieSupabaseUrl(request: NextRequest): string {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const internalUrl = process.env.SUPABASE_INTERNAL_URL;

  if (!internalUrl) return publicUrl;

  try {
    const publicHost = new URL(publicUrl).hostname;
    return publicHost === request.nextUrl.hostname ? internalUrl : publicUrl;
  } catch {
    return publicUrl;
  }
}

function getAuthCookieName(): string {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  try {
    const publicHost = new URL(publicUrl).hostname.split('.')[0];
    return `sb-${publicHost}-auth-token`;
  } catch {
    return 'supabase.auth.token';
  }
}

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: 'Logged out' });

    const supabase = createServerClient(
      getCookieSupabaseUrl(request),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: {
          name: getAuthCookieName(),
        },
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      },
    );

    await supabase.auth.signOut();

    return response;
  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
