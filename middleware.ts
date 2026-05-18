import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname, search } = request.nextUrl;

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

  const supabase = createServerClient(
    process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
    '/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|llms\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
