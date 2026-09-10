import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

if (process.env.VERCEL) {
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "auto-dm-nine.vercel.app";
  const url = `https://${host}`;
  process.env.NEXTAUTH_URL = url;
  process.env.AUTH_URL = url;
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export async function proxy(request: NextRequest) {
  try {
    const res = await (auth as any)(request);
    return res || NextResponse.next();
  } catch (err) {
    console.error("[Proxy Handled Error]:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!api/auth|api/webhooks|api/bio|api/test|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
