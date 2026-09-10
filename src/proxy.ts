import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);
export const proxy = auth;

export const config = {
  matcher: [
    "/((?!api/auth|api/webhooks|api/bio|api/test|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
