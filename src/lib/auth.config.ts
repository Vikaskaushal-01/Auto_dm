import type { NextAuthConfig } from "next-auth";

// Ensure production base URL never points to localhost
if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  const prodUrl =
    process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")
      ? process.env.NEXTAUTH_URL
      : process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://auto-dm-nine.vercel.app";

  process.env.AUTH_URL = prodUrl;
  process.env.NEXTAUTH_URL = prodUrl;
}

/**
 * Edge-safe NextAuth config: no Prisma/bcrypt imports here.
 * The full config (src/lib/auth.ts) extends this with the Credentials
 * provider and runs in the Node.js runtime.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
    redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) {
        const liveBase = baseUrl.includes("localhost")
          ? "https://auto-dm-nine.vercel.app"
          : baseUrl;
        return `${liveBase}${url}`;
      }
      // Sanitize any accidental localhost redirects
      if (url.includes("localhost")) {
        return url.replace(/https?:\/\/localhost(:\d+)?/, "https://auto-dm-nine.vercel.app");
      }
      return url;
    },
  },
} satisfies NextAuthConfig;
