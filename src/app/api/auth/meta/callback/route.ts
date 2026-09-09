import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { encryptToken } from "@/lib/security/encryption";
import type { PostType } from "@/types/models";

interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
  };
}

interface IgMediaItem {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = new URL("/settings/integrations", request.url);

  if (error || errorDescription) {
    baseUrl.searchParams.set("error", errorDescription || error || "Meta authorization cancelled");
    return NextResponse.redirect(baseUrl);
  }

  if (!code || !state) {
    baseUrl.searchParams.set("error", "Missing authorization code or state parameter");
    return NextResponse.redirect(baseUrl);
  }

  // Instagram may append #_ to code in some browsers
  code = code.replace(/#_$/, "");

  // Validate state
  const stateCookie = request.cookies.get("meta_oauth_state")?.value;
  if (!stateCookie || stateCookie !== state) {
    baseUrl.searchParams.set("error", "Invalid or expired state session. Please try connecting again.");
    return NextResponse.redirect(baseUrl);
  }

  const [stateString, signature] = state.split(".");
  if (!stateString || !signature) {
    baseUrl.searchParams.set("error", "Malformed state parameter.");
    return NextResponse.redirect(baseUrl);
  }

  const secret = process.env.AUTH_SECRET || "meta_oauth_secret_key";
  const expectedSig = crypto.createHmac("sha256", secret).update(stateString).digest("hex");
  if (signature !== expectedSig) {
    baseUrl.searchParams.set("error", "Security signature mismatch on OAuth state.");
    return NextResponse.redirect(baseUrl);
  }

  let statePayload: {
    workspaceId: string;
    userId: string;
    platform: string;
    nonce: string;
    timestamp: number;
  };

  try {
    statePayload = JSON.parse(Buffer.from(stateString, "base64url").toString("utf8"));
  } catch {
    baseUrl.searchParams.set("error", "Failed to decode state data.");
    return NextResponse.redirect(baseUrl);
  }

  if (Date.now() - statePayload.timestamp > 15 * 60 * 1000) {
    baseUrl.searchParams.set("error", "OAuth session expired. Please try connecting again.");
    return NextResponse.redirect(baseUrl);
  }

  const { workspaceId, platform } = statePayload;
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri =
    process.env.META_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/meta/callback`;

  if (!appId || !appSecret) {
    baseUrl.searchParams.set("error", "META_APP_ID or META_APP_SECRET is not configured on the server.");
    return NextResponse.redirect(baseUrl);
  }

  try {
    // =========================================================================
    // FLOW 1: Instagram Login for Professionals (Direct Instagram API)
    // =========================================================================
    if (platform === "instagram") {
      let shortLivedToken: string | null = null;
      let igUserId: string | null = null;

      // 1. Try exchange via api.instagram.com/oauth/access_token
      const igForm = new URLSearchParams();
      igForm.set("client_id", appId);
      igForm.set("client_secret", appSecret);
      igForm.set("grant_type", "authorization_code");
      igForm.set("redirect_uri", redirectUri);
      igForm.set("code", code);

      try {
        const igRes = await fetch("https://api.instagram.com/oauth/access_token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: igForm.toString(),
        });
        const igData = await igRes.json();

        if (igRes.ok && igData.access_token) {
          shortLivedToken = igData.access_token;
          igUserId = igData.user_id ? String(igData.user_id) : null;
        } else {
          console.warn("api.instagram.com token exchange response:", igData);
        }
      } catch (err) {
        console.warn("api.instagram.com token exchange network error:", err);
      }

      // If Instagram direct exchange succeeded
      if (shortLivedToken && igUserId) {
        // Exchange short-lived token for long-lived Instagram token (60 days)
        let longLivedToken = shortLivedToken;
        let tokenExpiresIn = 60 * 24 * 60 * 60;

        try {
          const longUrl = new URL("https://graph.instagram.com/access_token");
          longUrl.searchParams.set("grant_type", "ig_exchange_token");
          longUrl.searchParams.set("client_secret", appSecret);
          longUrl.searchParams.set("access_token", shortLivedToken);

          const longRes = await fetch(longUrl.toString());
          const longData = await longRes.json();
          if (longRes.ok && longData.access_token) {
            longLivedToken = longData.access_token;
            if (typeof longData.expires_in === "number") {
              tokenExpiresIn = longData.expires_in;
            }
          }
        } catch (e) {
          console.warn("Instagram long-lived token exchange notice:", e);
        }

        // Fetch detailed profile from graph.instagram.com
        let profileInfo: any = null;
        try {
          const meUrl = new URL("https://graph.instagram.com/v21.0/me");
          meUrl.searchParams.set(
            "fields",
            "user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count",
          );
          meUrl.searchParams.set("access_token", longLivedToken);

          const meRes = await fetch(meUrl.toString());
          if (meRes.ok) {
            profileInfo = await meRes.json();
          } else {
            // Fallback without version prefix
            const meFallbackUrl = new URL("https://graph.instagram.com/me");
            meFallbackUrl.searchParams.set(
              "fields",
              "id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count",
            );
            meFallbackUrl.searchParams.set("access_token", longLivedToken);
            const fbRes = await fetch(meFallbackUrl.toString());
            if (fbRes.ok) profileInfo = await fbRes.json();
          }
        } catch (e) {
          console.warn("graph.instagram.com/me notice:", e);
        }

        const username = profileInfo?.username || "instagram_user";
        const displayName = profileInfo?.name || username;
        const avatarUrl = profileInfo?.profile_picture_url || null;
        const finalUserId = profileInfo?.user_id || profileInfo?.id || igUserId;

        const encryptedToken = encryptToken(longLivedToken);

        // Upsert SocialAccount
        let socialAccount = await db.socialAccount.findFirst({
          where: { workspaceId, platform: "INSTAGRAM" },
        });

        if (socialAccount) {
          socialAccount = await db.socialAccount.update({
            where: { id: socialAccount.id },
            data: {
              externalAccountId: finalUserId,
              username,
              displayName,
              avatarUrl: avatarUrl || socialAccount.avatarUrl,
              status: "CONNECTED",
              isDemo: false,
              updatedAt: new Date(),
            },
          });
        } else {
          socialAccount = await db.socialAccount.create({
            data: {
              workspaceId,
              platform: "INSTAGRAM",
              externalAccountId: finalUserId,
              username,
              displayName,
              avatarUrl,
              status: "CONNECTED",
              isDemo: false,
            },
          });
        }

        // Upsert PlatformConnection (LIVE mode)
        const existingConn = await db.platformConnection.findUnique({
          where: { socialAccountId: socialAccount.id },
        });

        const connData = {
          mode: "LIVE" as const,
          accessToken: encryptedToken,
          refreshToken: null,
          tokenExpiresAt: new Date(Date.now() + tokenExpiresIn * 1000),
          scopes: [
            "instagram_business_basic",
            "instagram_business_manage_messages",
            "instagram_business_manage_comments",
            "instagram_business_manage_insights",
          ],
          metaAppUserId: finalUserId,
          lastSyncedAt: new Date(),
          lastSyncStatus: "SUCCESS",
          lastErrorMessage: null,
          updatedAt: new Date(),
        };

        if (existingConn) {
          await db.platformConnection.update({
            where: { id: existingConn.id },
            data: connData,
          });
        } else {
          await db.platformConnection.create({
            data: {
              socialAccountId: socialAccount.id,
              ...connData,
            },
          });
        }

        // Auto-subscribe app to Instagram webhooks (comments, messages)
        try {
          await fetch(`https://graph.instagram.com/v21.0/me/subscribed_apps?subscribed_fields=comments,messages&access_token=${longLivedToken}`, {
            method: "POST",
          });
          console.log("[Meta OAuth] Auto-subscribed Instagram account to webhooks");
        } catch (subErr) {
          console.warn("[Meta OAuth] Failed to auto-subscribe webhooks:", subErr);
        }

        // Upsert Profile
        const existingProfile = await db.profile.findUnique({
          where: { socialAccountId: socialAccount.id },
        });

        const profRecord = {
          followersCount: profileInfo?.followers_count ?? 0,
          followingCount: profileInfo?.follows_count ?? 0,
          mediaCount: profileInfo?.media_count ?? 0,
          bio: profileInfo?.biography ?? null,
          website: profileInfo?.website ?? null,
          profileVisits30d: 0,
          asOf: new Date(),
          updatedAt: new Date(),
        };

        if (existingProfile) {
          await db.profile.update({
            where: { id: existingProfile.id },
            data: profRecord,
          });
        } else {
          await db.profile.create({
            data: {
              socialAccountId: socialAccount.id,
              ...profRecord,
            },
          });
        }

        // Sync initial media
        try {
          const mediaUrl = new URL("https://graph.instagram.com/v21.0/me/media");
          mediaUrl.searchParams.set(
            "fields",
            "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
          );
          mediaUrl.searchParams.set("limit", "50");
          mediaUrl.searchParams.set("access_token", longLivedToken);

          const mediaRes = await fetch(mediaUrl.toString());
          if (mediaRes.ok) {
            const mediaJson = await mediaRes.json();
            const items: IgMediaItem[] = mediaJson.data || [];

            for (const item of items) {
              const postType: PostType =
                item.media_type === "VIDEO"
                  ? "REEL"
                  : item.media_type === "CAROUSEL_ALBUM"
                    ? "CAROUSEL"
                    : "IMAGE";

              const existingPost = await db.post.findFirst({
                where: { socialAccountId: socialAccount.id, externalId: item.id },
              });

              if (!existingPost) {
                await db.post.create({
                  data: {
                    socialAccountId: socialAccount.id,
                    externalId: item.id,
                    type: postType,
                    caption: item.caption || null,
                    mediaUrl: item.media_url || item.thumbnail_url || null,
                    thumbnailUrl: item.thumbnail_url || item.media_url || null,
                    permalink: item.permalink || null,
                    publishedAt: item.timestamp ? new Date(item.timestamp) : new Date(),
                  },
                });
              }
            }
          }
        } catch (err) {
          console.warn("Instagram media sync notice:", err);
        }

        const response = NextResponse.redirect(
          new URL("/settings/integrations?connected=instagram", request.url),
        );
        response.cookies.delete("meta_oauth_state");
        return response;
      }
    }

    // =========================================================================
    // FLOW 2: Facebook Login / Facebook Pages Graph API (Fallback & Facebook)
    // =========================================================================
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString(), { method: "GET" });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Meta token exchange error:", tokenData);
      const errMsg = tokenData.error?.message || "Failed to exchange code for access token";
      baseUrl.searchParams.set("error", errMsg);
      return NextResponse.redirect(baseUrl);
    }

    const shortLivedToken: string = tokenData.access_token;

    let longLivedToken = shortLivedToken;
    let tokenExpiresIn = 60 * 24 * 60 * 60;

    const longLivedUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString(), { method: "GET" });
    const longLivedData = await longLivedRes.json();
    if (longLivedRes.ok && longLivedData.access_token) {
      longLivedToken = longLivedData.access_token;
      if (typeof longLivedData.expires_in === "number") {
        tokenExpiresIn = longLivedData.expires_in;
      }
    }

    const accountsUrl = new URL("https://graph.facebook.com/v21.0/me/accounts");
    accountsUrl.searchParams.set(
      "fields",
      "id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}",
    );
    accountsUrl.searchParams.set("access_token", longLivedToken);

    const accountsRes = await fetch(accountsUrl.toString(), { method: "GET" });
    const accountsData = await accountsRes.json();

    if (!accountsRes.ok) {
      console.error("Meta me/accounts query error:", accountsData);
      const errMsg = accountsData.error?.message || "Failed to retrieve Facebook Pages from Meta";
      baseUrl.searchParams.set("error", errMsg);
      return NextResponse.redirect(baseUrl);
    }

    const pages: MetaPage[] = accountsData.data || [];

    if (platform === "facebook") {
      if (pages.length === 0) {
        baseUrl.searchParams.set(
          "error",
          "No Facebook Pages were found under your Meta account. Please create a Facebook Page first.",
        );
        return NextResponse.redirect(baseUrl);
      }

      const page = pages[0];
      const pageToken = page.access_token || longLivedToken;
      const encryptedToken = encryptToken(pageToken);

      let socialAccount = await db.socialAccount.findFirst({
        where: { workspaceId, platform: "MESSENGER" },
      });

      if (socialAccount) {
        socialAccount = await db.socialAccount.update({
          where: { id: socialAccount.id },
          data: {
            externalAccountId: page.id,
            username: page.name,
            displayName: page.name,
            status: "CONNECTED",
            isDemo: false,
            updatedAt: new Date(),
          },
        });
      } else {
        socialAccount = await db.socialAccount.create({
          data: {
            workspaceId,
            platform: "MESSENGER",
            externalAccountId: page.id,
            username: page.name,
            displayName: page.name,
            avatarUrl: null,
            status: "CONNECTED",
            isDemo: false,
          },
        });
      }

      const existingConn = await db.platformConnection.findUnique({
        where: { socialAccountId: socialAccount.id },
      });

      const connData = {
        mode: "LIVE" as const,
        accessToken: encryptedToken,
        refreshToken: null,
        tokenExpiresAt: new Date(Date.now() + tokenExpiresIn * 1000),
        scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_metadata", "pages_messaging"],
        metaAppUserId: page.id,
        lastSyncedAt: new Date(),
        lastSyncStatus: "SUCCESS",
        lastErrorMessage: null,
        updatedAt: new Date(),
      };

      if (existingConn) {
        await db.platformConnection.update({
          where: { id: existingConn.id },
          data: connData,
        });
      } else {
        await db.platformConnection.create({
          data: {
            socialAccountId: socialAccount.id,
            ...connData,
          },
        });
      }

      const response = NextResponse.redirect(new URL("/settings/integrations?connected=facebook", request.url));
      response.cookies.delete("meta_oauth_state");
      return response;
    }

    // Instagram via Facebook Page
    const pageWithIg = pages.find((p) => p.instagram_business_account?.id);

    if (!pageWithIg || !pageWithIg.instagram_business_account) {
      const err =
        "No Instagram Professional account found linked to your Facebook Pages. " +
        "Please ensure your Instagram account is switched to Professional (Business or Creator).";
      baseUrl.searchParams.set("error", err);
      return NextResponse.redirect(baseUrl);
    }

    const igAccount = pageWithIg.instagram_business_account;
    const pageToken = pageWithIg.access_token || longLivedToken;
    const igUserId = igAccount.id;

    let profileData: any = null;
    try {
      const profileUrl = new URL(`https://graph.facebook.com/v21.0/${igUserId}`);
      profileUrl.searchParams.set(
        "fields",
        "id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url",
      );
      profileUrl.searchParams.set("access_token", pageToken);
      const profileRes = await fetch(profileUrl.toString());
      if (profileRes.ok) {
        profileData = await profileRes.json();
      }
    } catch (e) {
      console.warn("Could not fetch extended IG profile details:", e);
    }

    const encryptedToken = encryptToken(pageToken);
    const username = profileData?.username || igAccount.username || "instagram_user";
    const displayName = profileData?.name || igAccount.name || username;
    const avatarUrl = profileData?.profile_picture_url || igAccount.profile_picture_url || null;

    let socialAccount = await db.socialAccount.findFirst({
      where: { workspaceId, platform: "INSTAGRAM" },
    });

    if (socialAccount) {
      socialAccount = await db.socialAccount.update({
        where: { id: socialAccount.id },
        data: {
          externalAccountId: igUserId,
          username,
          displayName,
          avatarUrl: avatarUrl || socialAccount.avatarUrl,
          status: "CONNECTED",
          isDemo: false,
          updatedAt: new Date(),
        },
      });
    } else {
      socialAccount = await db.socialAccount.create({
        data: {
          workspaceId,
          platform: "INSTAGRAM",
          externalAccountId: igUserId,
          username,
          displayName,
          avatarUrl,
          status: "CONNECTED",
          isDemo: false,
        },
      });
    }

    const existingConn = await db.platformConnection.findUnique({
      where: { socialAccountId: socialAccount.id },
    });

    const connData = {
      mode: "LIVE" as const,
      accessToken: encryptedToken,
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + tokenExpiresIn * 1000),
      scopes: [
        "instagram_basic",
        "instagram_manage_comments",
        "instagram_manage_messages",
        "pages_show_list",
        "pages_read_engagement",
        "business_management",
      ],
      metaAppUserId: igUserId,
      lastSyncedAt: new Date(),
      lastSyncStatus: "SUCCESS",
      lastErrorMessage: null,
      updatedAt: new Date(),
    };

    if (existingConn) {
      await db.platformConnection.update({
        where: { id: existingConn.id },
        data: connData,
      });
    } else {
      await db.platformConnection.create({
        data: {
          socialAccountId: socialAccount.id,
          ...connData,
        },
      });
    }

    const response = NextResponse.redirect(
      new URL("/settings/integrations?connected=instagram", request.url),
    );
    response.cookies.delete("meta_oauth_state");
    return response;
  } catch (err: any) {
    console.error("Meta OAuth callback exception:", err);
    baseUrl.searchParams.set("error", err?.message || "An unexpected error occurred during Meta authentication");
    return NextResponse.redirect(baseUrl);
  }
}
