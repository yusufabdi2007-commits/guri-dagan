import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
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
      request.nextUrl.pathname.startsWith("/offline");
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

  // getSession() reads the JWT from the cookie — no network call, never hangs.
  const { data: { session } } = await supabase.auth.getSession();
  let user = session?.user ?? null;

  const isAuthPage = request.nextUrl.pathname.startsWith("/login");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isPublicAsset =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.includes(".");
  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/book") ||
    request.nextUrl.pathname.startsWith("/contact") ||
    request.nextUrl.pathname.startsWith("/status") ||
    request.nextUrl.pathname.startsWith("/offline");

  // No login UI — silently establish a session for the app owner via a
  // server-minted magic-link token (using the service role key), so no
  // password ever needs to be stored. There's never a login form to fill out.
  if (!user && !isApiRoute && !isPublicAsset && !isPublicRoute) {
    const ownerEmail = process.env.OWNER_EMAIL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (ownerEmail && serviceKey) {
      const admin = createAdminClient(supabaseUrl, serviceKey);
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: ownerEmail,
      });
      const tokenHash = linkData?.properties?.hashed_token;
      if (!linkError && tokenHash) {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          type: "magiclink",
          token_hash: tokenHash,
        });
        if (!verifyError) user = verifyData.user;
      }
    }
  }

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
