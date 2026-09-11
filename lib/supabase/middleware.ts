import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const isAuthPage = request.nextUrl.pathname.startsWith("/login");
    const isPublicRoute =
      request.nextUrl.pathname.startsWith("/api") ||
      request.nextUrl.pathname.startsWith("/book") ||
      request.nextUrl.pathname.startsWith("/contact") ||
      request.nextUrl.pathname.startsWith("/status") ||
      request.nextUrl.pathname.startsWith("/offline") ||
      request.nextUrl.pathname === "/academy" ||
      request.nextUrl.pathname.startsWith("/academy/login") ||
      request.nextUrl.pathname.startsWith("/academy/course");
    if (!isAuthPage && !isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() revalidates against the Supabase Auth server (unlike
  // getSession(), which only decodes the local JWT and trusts it blindly).
  // Using getSession() here previously meant a revoked/invalid-server-side
  // session could still pass this gate while a page's own getUser() check
  // failed and redirected to /login — and /login's own gate (below) would
  // then see the same stale-but-locally-valid session and bounce back to
  // /today, an infinite redirect loop with no way out but clearing cookies.
  const { data: { user: authedUser } } = await supabase.auth.getUser();
  const user = authedUser;

  const isAuthPage = request.nextUrl.pathname.startsWith("/login");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isPublicAsset =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.includes(".");
  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/book") ||
    request.nextUrl.pathname.startsWith("/contact") ||
    request.nextUrl.pathname.startsWith("/status") ||
    request.nextUrl.pathname.startsWith("/offline") ||
    request.nextUrl.pathname === "/academy" ||
    request.nextUrl.pathname.startsWith("/academy/login") ||
    request.nextUrl.pathname.startsWith("/academy/course");

  if (!user && !isAuthPage && !isApiRoute && !isPublicAsset && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
