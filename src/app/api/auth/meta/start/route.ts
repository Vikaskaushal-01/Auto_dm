import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.workspaceId) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", "/settings/integrations");
    return NextResponse.redirect(url);
  }

  const platform = request.nextUrl.searchParams.get("platform") || "instagram";
  const appId = process.env.META_APP_ID;
  const redirectUri =
    process.env.META_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/meta/callback`;

  if (!appId) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=missing_meta_app_id", request.url),
    );
  }

  // Generate a secure CSRF state token encoding workspace and platform
  const statePayload = {
    workspaceId: session.workspaceId,
    userId: session.user.id,
    platform,
    nonce: crypto.randomBytes(16).toString("hex"),
    timestamp: Date.now(),
  };

  const stateString = Buffer.from(JSON.stringify(statePayload)).toString("base64url");
  const secret = process.env.AUTH_SECRET || "meta_oauth_secret_key";
  const signature = crypto.createHmac("sha256", secret).update(stateString).digest("hex");
  const state = `${stateString}.${signature}`;

  let authUrl: URL;

  if (platform === "instagram") {
    // Instagram Login for Professionals uses api.instagram.com/oauth/authorize
    // which corresponds to the Instagram App ID created in the Meta Developer portal
    authUrl = new URL("https://api.instagram.com/oauth/authorize");
    authUrl.searchParams.set("enable_fb_login", "0");
    authUrl.searchParams.set("force_authentication", "1");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_manage_insights",
    );
    authUrl.searchParams.set("state", state);
  } else {
    // Facebook Login for Pages & Messenger
    authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set(
      "scope",
      "pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging",
    );
    authUrl.searchParams.set("response_type", "code");
  }

  const response = NextResponse.redirect(authUrl.toString());

  // Store state in an HTTP-only cookie for verification
  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60, // 15 minutes
    path: "/",
  });

  return response;
}
