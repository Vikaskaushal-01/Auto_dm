import type { NextAuthConfig } from "next-auth";

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
  },
} satisfies NextAuthConfig;
