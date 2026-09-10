import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMetaRedirectUri } from "@/lib/server-url";

const INSTAGRAM_DIRECT_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",");

const FACEBOOK_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "pages_messaging",
].join(",");

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !session.workspaceId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform")?.toLowerCase() ?? "instagram";
  const isInstagram = platform === "instagram";

  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=meta_app_id_missing", request.url),
    );
  }

  // Determine redirect URI (auto-detects Vercel production domain or respects META_REDIRECT_URI)
  const redirectUri = getMetaRedirectUri(request.url);

  const stateObj = {
    workspaceId: session.workspaceId,
    userId: session.user.id,
    platform,
    authProvider: isInstagram ? "instagram" : "facebook",
    timestamp: Date.now(),
  };
  const state = Buffer.from(JSON.stringify(stateObj)).toString("base64url");

  // Instagram App IDs use api.instagram.com/oauth/authorize directly.
  // Facebook Pages use facebook.com/v21.0/dialog/oauth.
  const authUrl = isInstagram
    ? new URL("https://api.instagram.com/oauth/authorize")
    : new URL("https://www.facebook.com/v21.0/dialog/oauth");

  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", isInstagram ? INSTAGRAM_DIRECT_SCOPES : FACEBOOK_SCOPES);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}
