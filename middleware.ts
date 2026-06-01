import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'

const ALLOWED_ORIGINS = [
  'https://www.botwave.online',
  'https://botwave.online',
  'http://localhost:3000',
  'http://localhost:3001',
];

// ── API Rate Limiting (in-memory, per-IP) ─────────────────────────────
// Authenticated dashboard users skip this entirely (see hasSupabaseAuthCookie).
// Anonymous traffic is rate-limited to protect public endpoints from abuse.
// Both window and max are env-configurable. Set API_RATE_LIMIT_MAX=0 to disable.
const RATE_LIMIT_WINDOW_MS =
  Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 60_000; // 1 minute
const RATE_LIMIT_MAX = (() => {
  const raw = process.env.API_RATE_LIMIT_MAX;
  if (raw === undefined || raw === '') return 300;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 300;
})();
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

// Paths exempt from rate limiting
const RATE_LIMIT_EXEMPT = [
  '/api/evolution/webhook',
  '/api/telegram/webhook',
  '/api/notify/',
  '/api/payments/webhook',
  '/api/email/bounce',
];

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  // Supabase SSR sets cookies named `sb-<projectref>-auth-token` (sometimes
  // split into `.0`, `.1` chunks). Treat the presence of any such cookie as a
  // signal the request is from a logged-in dashboard user, who should not be
  // affected by the anti-abuse IP rate limit.
  for (const cookie of request.cookies.getAll()) {
    const name = cookie.name;
    if (name.startsWith('sb-') && name.includes('-auth-token')) {
      return true;
    }
  }
  return false;
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  if (RATE_LIMIT_MAX === 0) {
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER };
  }
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

// Cleanup stale rate limit entries every 2 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
        rateLimitMap.delete(ip);
      }
    }
  }, 120_000);
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname, search } = request.nextUrl;

  // API rate limiting (skip webhooks, static assets, and authenticated users).
  // Authenticated dashboard users (detected via Supabase auth cookie) bypass
  // this entirely so navigating the dashboard never trips a 429. Routes still
  // have their own per-action limits (signup, login, send-code, etc.).
  if (
    pathname.startsWith('/api/') &&
    !RATE_LIMIT_EXEMPT.some((p) => pathname.startsWith(p)) &&
    !hasSupabaseAuthCookie(request)
  ) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const { allowed } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }
  }

  // CSRF protection: validate Origin header on mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin');
    // Skip CSRF for webhook endpoints (called by external services)
    const isWebhook = pathname.startsWith('/api/evolution/webhook') ||
      pathname.startsWith('/api/telegram/webhook') ||
      pathname.startsWith('/api/notify/') ||
      pathname.startsWith('/api/payments/webhook');
    if (!isWebhook && origin && !ALLOWED_ORIGINS.includes(origin)) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }
  }

  // Redirect non-www to www (canonical domain)
  if (host === 'botwave.online' || host === 'botwave.online:443') {
    return NextResponse.redirect(
      new URL(`https://www.botwave.online${pathname}${search}`),
      301,
    );
  }

  // Redirect legacy /index.php to /
  if (pathname === '/index.php') {
    return NextResponse.redirect(new URL('/', request.url), 301);
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const authPath = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup');

  if (authPath) {
    // Middleware MUST use NEXT_PUBLIC_SUPABASE_URL (not internal URL) because the
    // cookie name is derived from the URL hostname. Using internal URL would look
    // for "sb-supabase-kong-auth-token" instead of the actual "sb-144-auth-token".
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    let authenticatedUser = user;
    if (!authenticatedUser) {
      const { data: { session } } = await supabase.auth.getSession();
      authenticatedUser = session?.user ?? null;
    }

    // Protect dashboard routes
    if (!authenticatedUser && request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Redirect logged in users away from auth pages
    if (authenticatedUser && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    
    if (!tokenValidation) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sitemap.xml, robots.txt (SEO files served without auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|sitemap/|robots\\.txt|llms\\.txt|llms-full\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xml|txt)$).*)',
  ],
}
