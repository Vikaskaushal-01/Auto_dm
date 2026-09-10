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

/**
 * Edge-safe NextAuth config: no Prisma/bcrypt imports here. Middleware runs
 * on the Edge Runtime, which can't load the Prisma client (needs Node APIs).
 * The full config (src/lib/auth.ts) extends this with the Credentials
 * provider and runs in the Node.js runtime (route handlers, server actions,
 * server components).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

      if (pathname === "/") {
        return Response.redirect(
          new URL(isLoggedIn ? "/dashboard" : "/login", request.nextUrl),
        );
      }
      if (isLoggedIn && isPublicPath) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      if (!isLoggedIn && !isPublicPath) {
        return false; // NextAuth redirects to pages.signIn with ?callbackUrl=
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
