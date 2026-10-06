import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// A refresh token can keep a session alive indefinitely as long as the user
// keeps making requests, so relying on the Supabase access token's own ~1hr
// expiry never actually signs anyone out. This cookie tracks the last time
// we saw a request from this session; once it's stale we force a sign-out
// instead of silently refreshing.
const INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1000; // 2 hours
const LAST_ACTIVITY_COOKIE = "last_activity";

function redirectToLogin(request: NextRequest, from: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const lastActivity = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
  const now = Date.now();
  const inactive = !!lastActivity && now - Number(lastActivity) > INACTIVITY_LIMIT_MS;

  if (inactive) {
    await supabase.auth.signOut();
    const redirect = redirectToLogin(request, response);
    redirect.cookies.delete(LAST_ACTIVITY_COOKIE);
    return redirect;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    return redirectToLogin(request, response);
  }

  if (user) {
    response.cookies.set(LAST_ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: INACTIVITY_LIMIT_MS / 1000,
    });
  }

  return response;
}

export const config = {
  matcher: [
    {
      // /api/* is excluded — those routes authenticate mobile clients via a
      // bearer token (see lib/supabase/route.ts), not the cookie session
      // this proxy checks, so redirecting them to /login would just hand
      // back HTML where the client expects JSON.
      source: "/((?!_next/static|_next/image|favicon.ico|brand|login|api).*)",
      // Next.js prefetches every <Link> visible in the sidebar in the
      // background. Those requests carry this header and would otherwise
      // keep bumping last_activity forever, so a genuinely idle user (who
      // never clicks anything, just leaves the tab open) would never time
      // out. Excluding them has to happen here in the matcher — the header
      // is stripped from `request.headers` before the proxy body runs.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
