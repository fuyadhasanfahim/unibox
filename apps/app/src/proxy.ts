import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: it checks that a session cookie exists, not that it is valid.
// Real authorization happens on every API call (and the app shell re-checks the session).
export function proxy(request: NextRequest) {
  const signedIn = Boolean(getSessionCookie(request, { cookiePrefix: "unibox" }));
  const { pathname, search } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL(signedIn ? "/dashboard" : "/sign-in", request.url));
  }
  if (!signedIn) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/inbox/:path*",
    "/leads/:path*",
    "/follow-ups/:path*",
    "/channels/:path*",
    "/team/:path*",
    "/settings/:path*",
  ],
};
