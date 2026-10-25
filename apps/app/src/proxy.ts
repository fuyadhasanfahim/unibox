import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/env/server";

const CLIENT_IP_HEADER = "x-unibox-client-ip";
const PROXY_SECRET_HEADER = "x-unibox-proxy-secret";

// The client IP comes only from the header our load balancer sets (clients cannot forge it there).
// In dev there is no load balancer and every request is local.
function clientIp(request: NextRequest): string {
  const trusted = serverEnv.TRUSTED_CLIENT_IP_HEADER;
  const value = trusted ? request.headers.get(trusted)?.split(",")[0]?.trim() : undefined;
  return value || "127.0.0.1";
}

// /api/* is rewritten to the API. Overwrite (never append) the identity headers the API trusts,
// so whatever a client sends in them is discarded.
function forwardToApi(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("x-forwarded-for");
  headers.set(CLIENT_IP_HEADER, clientIp(request));
  headers.set(PROXY_SECRET_HEADER, serverEnv.INTERNAL_PROXY_SECRET);
  return NextResponse.next({ request: { headers } });
}

// Optimistic page gate: it checks that a session cookie exists, not that it is valid.
// Real authorization happens on every API call (and the app shell re-checks the session).
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) return forwardToApi(request);

  const signedIn = Boolean(getSessionCookie(request, { cookiePrefix: "unibox" }));
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
    "/api/:path*",
    "/dashboard/:path*",
    "/inbox/:path*",
    "/leads/:path*",
    "/follow-ups/:path*",
    "/channels/:path*",
    "/team/:path*",
    "/settings/:path*",
    "/invitations/:path*",
  ],
};
