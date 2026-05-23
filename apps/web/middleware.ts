import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const jwtRole = user?.app_metadata?.role ?? user?.user_metadata?.role ?? null;
  console.log('[middleware] pathname=%s userId=%s jwtRole=%s', pathname, user?.id ?? 'anon', jwtRole ?? 'none');

  // Public routes — API routes handle their own auth internally
  const isPublic =
    pathname.startsWith('/trace/') ||
    pathname.startsWith('/api/') ||
    pathname === '/login';

  if (!isPublic && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname === '/login' && user) {
    const dest = jwtRole === 'supplier' ? '/portal' : '/dashboard';
    console.log('[middleware] /login + authenticated → redirect %s (jwtRole=%s)', dest, jwtRole ?? 'none');
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Redirect supplier users away from the admin (app) shell.
  // Definitive check happens in (app)/layout.tsx via DB; this is a fast-path
  // using JWT metadata so it fires even without a layout render.
  const isAppShellRoute =
    !pathname.startsWith('/portal') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/trace') &&
    pathname !== '/login';

  if (isAppShellRoute && user && jwtRole === 'supplier') {
    console.log('[middleware] supplier on app-shell route → redirect /portal');
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  if (pathname.startsWith('/portal/') && user) {
    if (jwtRole && jwtRole !== 'supplier' && jwtRole !== 'admin') {
      console.log('[middleware] non-supplier/admin on /portal/ → redirect /dashboard (jwtRole=%s)', jwtRole);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/public).*)'],
};
