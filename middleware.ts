import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Refreshes the Supabase session and gates /admin. This is only a first line of defence:
 *  every admin page/action re-verifies the admin role on the server and RLS enforces it in the database. */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith('/policies/')) {
    const segments = path.split('/').filter(Boolean);
    const validSlugs = ['terms', 'privacy', 'cancellation', 'payment'];
    if (segments.length !== 2 || !validSlugs.includes(segments[1])) {
      return new Response('<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | KaamSet</title></head><body style="font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#fffaf5;color:#171923"><main style="max-width:36rem;padding:2rem;text-align:center"><img src="/logo-header.png" alt="KaamSet" width="180" height="48"><h1>We could not find that page</h1><p>The link may be old or mistyped. You can head back home or book a service.</p><p><a href="/">Go home</a> · <a href="/book">Book a service</a></p></main></body></html>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
      });
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: ((list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }) satisfies SetAllCookies,
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ['/admin/:path*', '/policies/:path*'] };
