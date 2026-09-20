import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMetaRedirectUri } from "@/lib/server-url";
import { getInstagramAppCredentials, INSTAGRAM_LOGIN_SCOPES } from "@/lib/instagram-config";

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

  // Instagram uses Instagram Login (its own app id); Facebook Pages use Facebook Login (Meta app id)
  const appId = isInstagram
    ? getInstagramAppCredentials().appId
    : process.env.META_APP_ID?.trim().replace(/^["']|["']$/g, "");
  if (!appId) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${isInstagram ? "instagram_app_id_missing" : "meta_app_id_missing"}`,
        request.url,
      ),
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

  const authUrl = new URL(
    isInstagram
      ? "https://www.instagram.com/oauth/authorize"
      : "https://www.facebook.com/v21.0/dialog/oauth",
  );

  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", isInstagram ? INSTAGRAM_LOGIN_SCOPES.join(",") : FACEBOOK_SCOPES);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}
