import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/analytics",
  "/automations",
  "/settings",
  "/billing",
  "/link-in-bio",
  "/crm",
  "/products",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Determine canonical live origin (never localhost on Vercel)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host =
    forwardedHost && !forwardedHost.includes("localhost")
      ? forwardedHost
      : process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        request.headers.get("host") ||
        "auto-dm-nine.vercel.app";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;

  // Check for NextAuth session cookie
  const sessionToken =
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("authjs.session-token")?.value;
  const isLoggedIn = Boolean(sessionToken);

  // 1. Root page: redirect to /dashboard if logged in, /login if not
  if (pathname === "/") {
    const target = isLoggedIn ? "/dashboard" : "/login";
    return NextResponse.redirect(new URL(target, baseUrl));
  }

  // 2. Auth pages (/login, /register): always serve directly
  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.next();
  }

  // 3. Protected dashboard routes: require login
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
