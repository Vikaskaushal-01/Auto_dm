import type { NextAuthConfig } from "next-auth";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/webhooks",
  "/api/bio",
  "/api/test",
  "/b",
  "/p",
];

// Ensure NEXTAUTH_URL and AUTH_URL never point to localhost when running on Vercel
if (process.env.VERCEL) {
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "auto-dm-nine.vercel.app";
  const url = `https://${host}`;
  process.env.NEXTAUTH_URL = url;
  process.env.AUTH_URL = url;
}

function getLiveOrigin(request: {
  headers: { get: (name: string) => string | null };
  nextUrl?: { origin?: string };
}): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const host = request.headers.get("host");

  if (forwardedHost && !forwardedHost.includes("localhost")) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${forwardedHost}`;
  }
  if (vercelHost) {
    return `https://${vercelHost}`;
  }
  if (host && !host.includes("localhost")) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }
  return request.nextUrl?.origin || "http://localhost:3000";
}

/**
 * Edge-safe NextAuth config: no Prisma/bcrypt imports here. Middleware runs
 * on the Edge Runtime, which can't load the Prisma client (needs Node APIs).
 * The full config (src/lib/auth.ts) extends this with the Credentials
 * provider and runs in the Node.js runtime (route handlers, server actions,
 * server components).
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
      const origin = getLiveOrigin(request);

      if (pathname === "/") {
        return Response.redirect(
          new URL(isLoggedIn ? "/dashboard" : "/login", origin),
        );
      }
      if (isLoggedIn && isPublicPath) {
        return Response.redirect(new URL("/dashboard", origin));
      }
      if (!isLoggedIn && !isPublicPath) {
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return Response.redirect(loginUrl);
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
