import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/security/encryption";
import { getMetaRedirectUri } from "@/lib/server-url";

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface PageAccountItem {
  id: string;
  name: string;
  access_token: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
  instagram_business_account?: {
    id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const baseUrl = new URL("/settings/integrations", request.url);

  if (error || !code || !state) {
    const message = encodeURIComponent(errorDescription || error || "missing_code_or_state");
    baseUrl.searchParams.set("error", message);
    return NextResponse.redirect(baseUrl);
  }

  let stateData: { workspaceId: string; userId: string; platform: string; authProvider?: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    baseUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(baseUrl);
  }

  const { workspaceId, platform, authProvider } = stateData;
  const rawAppId = process.env.META_APP_ID;
  const rawAppSecret = process.env.META_APP_SECRET;
  const appId = rawAppId?.trim().replace(/^["']|["']$/g, "");
  const appSecret = rawAppSecret?.trim().replace(/^["']|["']$/g, "");
  const redirectUri = getMetaRedirectUri(request.url);

  if (!appId || !appSecret) {
    baseUrl.searchParams.set("error", "meta_credentials_missing_in_server");
    return NextResponse.redirect(baseUrl);
  }

  const cleanCode = code.replace(/#_$/, "");

  try {
    // 0. Direct Instagram Login (for Instagram App IDs created via Instagram API)
    if (authProvider === "instagram") {
      const igBody = new URLSearchParams();
      igBody.append("client_id", appId);
      igBody.append("client_secret", appSecret);
      igBody.append("grant_type", "authorization_code");
      igBody.append("redirect_uri", redirectUri);
      igBody.append("code", cleanCode);

      const igTokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: igBody.toString(),
      });
      const igTokenJson = (await igTokenRes.json()) as {
        access_token?: string;
        user_id?: string | number;
        permissions?: string[];
        error_type?: string;
        code?: number;
        error_message?: string;
      };

      if (igTokenRes.ok && igTokenJson.access_token) {
        const shortLivedToken = igTokenJson.access_token;
        const igUserId = String(igTokenJson.user_id);

        // Exchange for 60-day long-lived token
        let igAccessToken = shortLivedToken;
        let tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

        try {
          const longLivedUrl = new URL("https://graph.instagram.com/access_token");
          longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
          longLivedUrl.searchParams.set("client_secret", appSecret);
          longLivedUrl.searchParams.set("access_token", shortLivedToken);

          const longLivedRes = await fetch(longLivedUrl.toString());
          if (longLivedRes.ok) {
            const longLivedJson = (await longLivedRes.json()) as OAuthTokenResponse;
            if (longLivedJson.access_token) {
              igAccessToken = longLivedJson.access_token;
              const expSec = longLivedJson.expires_in ?? 60 * 24 * 60 * 60;
              tokenExpiresAt = new Date(Date.now() + expSec * 1000);
            }
          }
        } catch (llErr) {
          console.warn("Failed to exchange for long-lived IG token:", llErr);
        }

        // Fetch user profile from Instagram Graph API
        let username = `instagram_${igUserId}`;
        let displayName = `Instagram User`;
        let avatarUrl: string | null = null;

        try {
          const meUrl = `https://graph.instagram.com/v21.0/me?fields=id,username,name,profile_picture_url&access_token=${igAccessToken}`;
          const meRes = await fetch(meUrl);
          if (meRes.ok) {
            const meData = (await meRes.json()) as {
              id?: string;
              username?: string;
              name?: string;
              profile_picture_url?: string;
            };
            if (meData.username) username = meData.username;
            if (meData.name) displayName = meData.name;
            else if (meData.username) displayName = meData.username;
            if (meData.profile_picture_url) avatarUrl = meData.profile_picture_url;
          }
        } catch (meErr) {
          console.warn("Failed to fetch IG profile details:", meErr);
        }

        const encryptedToken = encryptToken(igAccessToken);

        const existingAccount = await prisma.socialAccount.findFirst({
          where: { workspaceId, platform: "INSTAGRAM" },
        });

        const socialAccount = existingAccount
          ? await prisma.socialAccount.update({
              where: { id: existingAccount.id },
              data: {
                externalAccountId: igUserId,
                username,
                displayName,
                avatarUrl,
                status: "CONNECTED",
                isDemo: false,
              },
            })
          : await prisma.socialAccount.create({
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

        await prisma.platformConnection.upsert({
          where: { socialAccountId: socialAccount.id },
          update: {
            mode: "LIVE",
            accessToken: encryptedToken,
            tokenExpiresAt,
            scopes: igTokenJson.permissions ?? [
              "instagram_business_basic",
              "instagram_business_manage_messages",
              "instagram_business_manage_comments",
            ],
            metaAppUserId: igUserId,
            lastSyncedAt: new Date(),
            lastSyncStatus: "SUCCESS",
            lastErrorMessage: null,
          },
          create: {
            socialAccountId: socialAccount.id,
            mode: "LIVE",
            accessToken: encryptedToken,
            tokenExpiresAt,
            scopes: igTokenJson.permissions ?? [
              "instagram_business_basic",
              "instagram_business_manage_messages",
              "instagram_business_manage_comments",
            ],
            metaAppUserId: igUserId,
            lastSyncedAt: new Date(),
            lastSyncStatus: "SUCCESS",
          },
        });

        baseUrl.searchParams.set("success", "instagram_connected");
        return NextResponse.redirect(baseUrl);
      } else if (authProvider === "instagram") {
        console.error("Instagram direct token exchange failed:", igTokenJson);
        baseUrl.searchParams.set(
          "error",
          encodeURIComponent(igTokenJson.error_message ?? "instagram_token_exchange_failed"),
        );
        return NextResponse.redirect(baseUrl);
      }
    }

    // 1. Facebook Login for Business: Exchange auth code for short-lived user access token
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", cleanCode);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenJson = (await tokenRes.json()) as OAuthTokenResponse & { error?: { message: string } };

    if (!tokenRes.ok || tokenJson.error) {
      console.error("Meta token exchange failed:", tokenJson.error);
      baseUrl.searchParams.set(
        "error",
        encodeURIComponent(tokenJson.error?.message ?? "token_exchange_failed"),
      );
      return NextResponse.redirect(baseUrl);
    }

    const shortLivedToken = tokenJson.access_token;

    // 2. Exchange short-lived token for long-lived token (60-day)
    const longLivedUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    const longLivedJson = (await longLivedRes.json()) as OAuthTokenResponse;
    const userAccessToken = longLivedJson.access_token || shortLivedToken;
    const expiresInSeconds = longLivedJson.expires_in ?? 60 * 24 * 60 * 60; // default 60 days
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // 3. Fetch user's managed Facebook Pages and linked Instagram Business Accounts
    const accountsUrl = new URL("https://graph.facebook.com/v21.0/me/accounts");
    accountsUrl.searchParams.set(
      "fields",
      "id,name,access_token,picture{url},instagram_business_account{id,username,name,profile_picture_url}",
    );
    accountsUrl.searchParams.set("access_token", userAccessToken);

    const accountsRes = await fetch(accountsUrl.toString());
    const accountsJson = (await accountsRes.json()) as {
      data?: PageAccountItem[];
      error?: { message: string };
    };

    if (!accountsRes.ok || !accountsJson.data || accountsJson.data.length === 0) {
      console.error("No Facebook pages found:", accountsJson.error);
      baseUrl.searchParams.set(
        "error",
        encodeURIComponent(
          accountsJson.error?.message ??
            "No Facebook Pages found. Ensure you are an Admin of a Facebook Page linked to your account.",
        ),
      );
      return NextResponse.redirect(baseUrl);
    }

    const pages = accountsJson.data;

    if (platform === "facebook") {
      // Connect first Facebook Page
      const page = pages[0];
      const pageAccessToken = page.access_token;
      const encryptedToken = encryptToken(pageAccessToken);

      const existingAccount = await prisma.socialAccount.findFirst({
        where: { workspaceId, platform: "MESSENGER" },
      });

      const socialAccount = existingAccount
        ? await prisma.socialAccount.update({
            where: { id: existingAccount.id },
            data: {
              externalAccountId: page.id,
              username: page.name.toLowerCase().replace(/\s+/g, ""),
              displayName: page.name,
              avatarUrl: page.picture?.data?.url ?? null,
              status: "CONNECTED",
              isDemo: false,
            },
          })
        : await prisma.socialAccount.create({
            data: {
              workspaceId,
              platform: "MESSENGER",
              externalAccountId: page.id,
              username: page.name.toLowerCase().replace(/\s+/g, ""),
              displayName: page.name,
              avatarUrl: page.picture?.data?.url ?? null,
              status: "CONNECTED",
              isDemo: false,
            },
          });

      await prisma.platformConnection.upsert({
        where: { socialAccountId: socialAccount.id },
        update: {
          mode: "LIVE",
          accessToken: encryptedToken,
          tokenExpiresAt,
          lastSyncedAt: new Date(),
          lastSyncStatus: "SUCCESS",
          lastErrorMessage: null,
        },
        create: {
          socialAccountId: socialAccount.id,
          mode: "LIVE",
          accessToken: encryptedToken,
          tokenExpiresAt,
          scopes: ["pages_show_list", "pages_read_engagement", "pages_messaging"],
          lastSyncedAt: new Date(),
          lastSyncStatus: "SUCCESS",
        },
      });

      baseUrl.searchParams.set("success", "facebook_connected");
      return NextResponse.redirect(baseUrl);
    }

    // Default: Instagram Business account connection
    const pageWithIg = pages.find((p) => p.instagram_business_account?.id);
    if (!pageWithIg || !pageWithIg.instagram_business_account) {
      baseUrl.searchParams.set(
        "error",
        encodeURIComponent(
          "No Instagram Business or Creator account is linked to your Facebook Page. Please convert your IG account to Professional and link it in Page Settings.",
        ),
      );
      return NextResponse.redirect(baseUrl);
    }

    const ig = pageWithIg.instagram_business_account;
    const pageToken = pageWithIg.access_token;
    const encryptedToken = encryptToken(pageToken);

    const existingAccount = await prisma.socialAccount.findFirst({
      where: { workspaceId, platform: "INSTAGRAM" },
    });

    const socialAccount = existingAccount
      ? await prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            externalAccountId: ig.id,
            username: ig.username,
            displayName: ig.name ?? ig.username,
            avatarUrl: ig.profile_picture_url ?? null,
            status: "CONNECTED",
            isDemo: false,
          },
        })
      : await prisma.socialAccount.create({
          data: {
            workspaceId,
            platform: "INSTAGRAM",
            externalAccountId: ig.id,
            username: ig.username,
            displayName: ig.name ?? ig.username,
            avatarUrl: ig.profile_picture_url ?? null,
            status: "CONNECTED",
            isDemo: false,
          },
        });

    await prisma.platformConnection.upsert({
      where: { socialAccountId: socialAccount.id },
      update: {
        mode: "LIVE",
        accessToken: encryptedToken,
        tokenExpiresAt,
        lastSyncedAt: new Date(),
        lastSyncStatus: "SUCCESS",
        lastErrorMessage: null,
      },
      create: {
        socialAccountId: socialAccount.id,
        mode: "LIVE",
        accessToken: encryptedToken,
        tokenExpiresAt,
        scopes: ["instagram_basic", "instagram_manage_comments", "instagram_manage_messages"],
        lastSyncedAt: new Date(),
        lastSyncStatus: "SUCCESS",
      },
    });

    // Also fetch and update the Profile row
    try {
      const igDetailsUrl = `https://graph.facebook.com/v21.0/${ig.id}?fields=followers_count,follows_count,media_count,biography,website&access_token=${pageToken}`;
      const igDetailsRes = await fetch(igDetailsUrl);
      if (igDetailsRes.ok) {
        const details = (await igDetailsRes.json()) as {
          followers_count?: number;
          follows_count?: number;
          media_count?: number;
          biography?: string;
          website?: string;
        };
        await prisma.profile.upsert({
          where: { socialAccountId: socialAccount.id },
          update: {
            followersCount: details.followers_count ?? 0,
            followingCount: details.follows_count ?? 0,
            mediaCount: details.media_count ?? 0,
            bio: details.biography ?? null,
            website: details.website ?? null,
            asOf: new Date(),
          },
          create: {
            socialAccountId: socialAccount.id,
            followersCount: details.followers_count ?? 0,
            followingCount: details.follows_count ?? 0,
            mediaCount: details.media_count ?? 0,
            bio: details.biography ?? null,
            website: details.website ?? null,
          },
        });
      }
    } catch (profileErr) {
      console.warn("Failed to fetch initial IG profile details:", profileErr);
    }

    baseUrl.searchParams.set("success", "instagram_connected");
    return NextResponse.redirect(baseUrl);
  } catch (err) {
    console.error("Meta OAuth callback exception:", err);
    baseUrl.searchParams.set(
      "error",
      encodeURIComponent(err instanceof Error ? err.message : "oauth_callback_failed"),
    );
    return NextResponse.redirect(baseUrl);
  }
}
