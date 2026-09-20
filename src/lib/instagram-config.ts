/**
 * Instagram API with Instagram Login.
 *
 * This uses a separate "Instagram app" id/secret (Meta dashboard → Instagram →
 * API setup with Instagram login), NOT the parent Meta app id/secret.
 */
export const INSTAGRAM_GRAPH_BASE = "https://graph.instagram.com/v21.0";

export const INSTAGRAM_LOGIN_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
];

function clean(value: string | undefined): string | undefined {
  return value?.trim().replace(/^["']|["']$/g, "") || undefined;
}

export function getInstagramAppCredentials(): { appId?: string; appSecret?: string } {
  return {
    appId: clean(process.env.INSTAGRAM_APP_ID),
    appSecret: clean(process.env.INSTAGRAM_APP_SECRET),
  };
}

/** True when a stored connection was created through Instagram Login. */
export function isInstagramLoginConnection(scopes: string[] | null | undefined): boolean {
  return !!scopes?.includes("instagram_business_basic");
}
