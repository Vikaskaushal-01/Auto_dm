import { db } from "@/lib/db";
import { decryptToken } from "@/lib/security/encryption";
import type { PostType } from "@/types/models";
import type {
  CommentDTO,
  ConnectionStatusDTO,
  DateRange,
  FollowerHistoryPointDTO,
  InstagramConnector,
  InstagramProfileDTO,
  PostDTO,
  PostTypeDTO,
  ReelInsightsDTO,
  SendDmInput,
  SendDmResultDTO,
} from "./types";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export class GraphAPIInstagramConnector implements InstagramConnector {
  /**
   * Helper: Resolves SocialAccount, PlatformConnection, and decrypts the access token.
   */
  private async getAuthContext(accountId: string) {
    const account = await db.socialAccount.findUnique({
      where: { id: accountId },
      include: { profile: true },
    });
    if (!account) {
      throw new Error(`SocialAccount not found: ${accountId}`);
    }

    const connection = await db.platformConnection.findUnique({
      where: { socialAccountId: accountId },
    });
    if (!connection || !connection.accessToken) {
      throw new Error(`Active PlatformConnection not found for account: ${accountId}`);
    }

    let token: string;
    try {
      token = decryptToken(connection.accessToken);
    } catch {
      // If token is stored unencrypted (legacy fallback)
      token = connection.accessToken;
    }

    const apiBase = token.startsWith("IG")
      ? "https://graph.instagram.com/v21.0"
      : "https://graph.facebook.com/v21.0";

    return {
      account,
      connection,
      token,
      igUserId: account.externalAccountId,
      apiBase,
    };
  }


  /**
   * GET /{ig-user-id}?fields=username,name,followers_count,follows_count,media_count,biography,website,profile_picture_url
   */
  async getProfile(accountId: string): Promise<InstagramProfileDTO> {
    const { account, token, igUserId, apiBase } = await this.getAuthContext(accountId);

    try {
      const url = new URL(`${apiBase}/${igUserId}`);
      url.searchParams.set(
        "fields",
        "username,name,followers_count,follows_count,media_count,biography,website,profile_picture_url",
      );
      url.searchParams.set("access_token", token);

      const res = await fetch(url.toString(), { next: { revalidate: 60 } });
      if (res.ok) {
        const data = await res.json();

        // Update database cache
        await db.socialAccount.update({
          where: { id: account.id },
          data: {
            username: data.username || account.username,
            displayName: data.name || account.displayName,
            avatarUrl: data.profile_picture_url || account.avatarUrl,
            updatedAt: new Date(),
          },
        });

        const profileRecord = {
          followersCount: data.followers_count ?? 0,
          followingCount: data.follows_count ?? 0,
          mediaCount: data.media_count ?? 0,
          bio: data.biography ?? null,
          website: data.website ?? null,
          profileVisits30d: 0,
          asOf: new Date(),
          updatedAt: new Date(),
        };

        const existingProfile = await db.profile.findUnique({
          where: { socialAccountId: account.id },
        });

        if (existingProfile) {
          await db.profile.update({
            where: { id: existingProfile.id },
            data: profileRecord,
          });
        } else {
          await db.profile.create({
            data: {
              socialAccountId: account.id,
              ...profileRecord,
            },
          });
        }

        return {
          accountId: account.id,
          username: data.username || account.username,
          displayName: data.name || account.displayName,
          avatarUrl: data.profile_picture_url || account.avatarUrl,
          followersCount: data.followers_count ?? 0,
          followingCount: data.follows_count ?? 0,
          mediaCount: data.media_count ?? 0,
          bio: data.biography ?? null,
          website: data.website ?? null,
        };
      }
    } catch (err) {
      console.warn("GraphAPI.getProfile error, falling back to cached DB data:", err);
    }

    // Fallback to database cached profile
    const mediaCount = await db.post.count({ where: { socialAccountId: accountId } });
    const profile = account.profile;

    return {
      accountId: account.id,
      username: account.username,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      followersCount: profile?.followersCount ?? 0,
      followingCount: profile?.followingCount ?? 0,
      mediaCount,
      bio: profile?.bio ?? null,
      website: profile?.website ?? null,
    };
  }

  /**
   * GET /{ig-user-id}/insights?metric=follower_count&period=day
   */
  async getFollowerHistory(
    accountId: string,
    range: DateRange,
  ): Promise<FollowerHistoryPointDTO[]> {
    const { token, igUserId, apiBase } = await this.getAuthContext(accountId);

    try {
      const sinceSec = Math.floor(range.start.getTime() / 1000);
      const untilSec = Math.floor(range.end.getTime() / 1000);

      const url = new URL(`${apiBase}/${igUserId}/insights`);
      url.searchParams.set("metric", "follower_count");
      url.searchParams.set("period", "day");
      url.searchParams.set("since", sinceSec.toString());
      url.searchParams.set("until", untilSec.toString());
      url.searchParams.set("access_token", token);

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        const values: Array<{ value: number; end_time: string }> =
          json.data?.[0]?.values || [];

        if (values.length > 0) {
          return values.map((v, i) => {
            const date = new Date(v.end_time);
            const prev = i > 0 ? values[i - 1].value : v.value;
            const net = v.value - prev;
            return {
              date,
              followersCount: v.value,
              gained: net > 0 ? net : 0,
              lost: net < 0 ? Math.abs(net) : 0,
              net,
            };
          });
        }
      }
    } catch (e) {
      console.warn("GraphAPI.getFollowerHistory insights notice:", e);
    }

    // Fallback: query follower snapshots from database
    const rows = await db.followerSnapshot.findMany({
      where: {
        socialAccountId: accountId,
        snapshotDate: { gte: range.start, lte: range.end },
      },
      orderBy: { snapshotDate: "asc" },
    });

    return rows.map((row) => ({
      date: row.snapshotDate,
      followersCount: row.followersCount,
      gained: row.gained,
      lost: row.lost,
      net: row.net,
    }));
  }

  /**
   * GET /{ig-user-id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp
   */
  async getPosts(
    accountId: string,
    opts?: { type?: PostTypeDTO; since?: Date },
  ): Promise<PostDTO[]> {
    const { token, igUserId, apiBase } = await this.getAuthContext(accountId);

    try {
      const url = new URL(`${apiBase}/${igUserId}/media`);
      url.searchParams.set(
        "fields",
        "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
      );
      url.searchParams.set("limit", "50");
      url.searchParams.set("access_token", token);

      const res = await fetch(url.toString(), { next: { revalidate: 120 } });
      if (res.ok) {
        const data = await res.json();
        const items = data.data || [];

        for (const item of items) {
          const postType: PostType =
            item.media_type === "VIDEO"
              ? "REEL"
              : item.media_type === "CAROUSEL_ALBUM"
                ? "CAROUSEL"
                : "IMAGE";

          const existing = await db.post.findFirst({
            where: { socialAccountId: accountId, externalId: item.id },
          });

          if (!existing) {
            await db.post.create({
              data: {
                socialAccountId: accountId,
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
      console.warn("GraphAPI.getPosts fetch notice, serving from DB:", err);
    }

    const rows = await db.post.findMany({
      where: {
        socialAccountId: accountId,
        type: opts?.type,
        publishedAt: opts?.since ? { gte: opts.since } : undefined,
      },
      orderBy: { publishedAt: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      externalId: row.externalId,
      type: row.type,
      caption: row.caption,
      mediaUrl: row.mediaUrl,
      thumbnailUrl: row.thumbnailUrl,
      permalink: row.permalink,
      publishedAt: row.publishedAt,
    }));
  }

  /**
   * GET /{media-id}/insights?metric=plays,reach,total_interactions,likes,comments,shares,saved
   */
  async getReelInsights(postId: string, range?: DateRange): Promise<ReelInsightsDTO> {
    const post = await db.post.findUnique({ where: { id: postId } });

    if (post && post.externalId) {
      try {
        const { token, apiBase } = await this.getAuthContext(post.socialAccountId);
        const url = new URL(`${apiBase}/${post.externalId}/insights`);
        url.searchParams.set(
          "metric",
          "views,reach,total_interactions,likes,comments,shares,saved,ig_reels_avg_watch_time",
        );
        url.searchParams.set("access_token", token);

        const res = await fetch(url.toString());
        if (res.ok) {
          const json = await res.json();
          const metricMap: Record<string, number> = {};
          for (const m of json.data || []) {
            metricMap[m.name] = m.values?.[0]?.value ?? 0;
          }

          const views = metricMap.views || metricMap.plays || 0;
          const reach = metricMap.reach || 0;
          const likes = metricMap.likes || 0;
          const comments = metricMap.comments || 0;
          const shares = metricMap.shares || 0;
          const saves = metricMap.saved || 0;
          const totalEng = metricMap.total_interactions || likes + comments + shares + saves;
          const engagementRate = reach > 0 ? (totalEng / reach) * 100 : 0;
          const avgWatchMs = metricMap.ig_reels_avg_watch_time ?? 0;
          const watchTimeSeconds = avgWatchMs > 0 ? Math.round(avgWatchMs / 1000) : 0;

          // Keep contentMetric cache fresh with live Instagram metrics
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const existing = await db.contentMetric.findFirst({
            where: { postId, metricDate: { gte: startOfToday } },
          });

          if (existing) {
            await db.contentMetric.update({
              where: { id: existing.id },
              data: { views, reach, impressions: views || reach, likes, comments, shares, saves, watchTimeSeconds, engagementRate },
            });
          }

          return {
            postId,
            views,
            reach,
            impressions: views || reach,
            likes,
            comments,
            shares,
            saves,
            watchTimeSeconds,
            engagementRate: Math.round(engagementRate * 100) / 100,
            profileVisits: 0,
            followersGained: 0,
            linkClicks: 0,
          };
        }
      } catch (err) {
        console.warn("GraphAPI.getReelInsights notice:", err);
      }
    }

    // Fallback: calculate from contentMetric table in database
    const rows = await db.contentMetric.findMany({
      where: {
        postId,
        metricDate: range ? { gte: range.start, lte: range.end } : undefined,
      },
    });

    const sum = (pick: (r: (typeof rows)[number]) => number) =>
      rows.reduce((acc, r) => acc + pick(r), 0);

    const engagementRate =
      rows.length > 0 ? sum((r) => r.engagementRate) / rows.length : 0;

    return {
      postId,
      views: sum((r) => r.views),
      reach: sum((r) => r.reach),
      impressions: sum((r) => r.impressions),
      likes: sum((r) => r.likes),
      comments: sum((r) => r.comments),
      shares: sum((r) => r.shares),
      saves: sum((r) => r.saves),
      watchTimeSeconds: sum((r) => r.watchTimeSeconds),
      engagementRate,
      profileVisits: sum((r) => r.profileVisits),
      followersGained: sum((r) => r.followersGained),
      linkClicks: sum((r) => r.linkClicks),
    };
  }

  /**
   * GET /{media-id}/comments?fields=id,username,text,timestamp
   */
  async getComments(postId: string, opts?: { since?: Date }): Promise<CommentDTO[]> {
    const post = await db.post.findUnique({ where: { id: postId } });

    if (post && post.externalId) {
      try {
        const { token, apiBase } = await this.getAuthContext(post.socialAccountId);
        const url = new URL(`${apiBase}/${post.externalId}/comments`);
        url.searchParams.set("fields", "id,username,text,timestamp");
        url.searchParams.set("limit", "50");
        url.searchParams.set("access_token", token);

        const res = await fetch(url.toString(), { next: { revalidate: 30 } });
        if (res.ok) {
          const json = await res.json();
          const items = json.data || [];

          for (const c of items) {
            const existing = await db.comment.findFirst({
              where: { postId, externalId: c.id },
            });

            if (!existing) {
              await db.comment.create({
                data: {
                  postId,
                  externalId: c.id,
                  authorUsername: c.username || "instagram_user",
                  text: c.text || "",
                  createdAtPlatform: c.timestamp ? new Date(c.timestamp) : new Date(),
                },
              });
            }
          }
        }
      } catch (err) {
        console.warn("GraphAPI.getComments notice:", err);
      }
    }

    const rows = await db.comment.findMany({
      where: {
        postId,
        createdAtPlatform: opts?.since ? { gte: opts.since } : undefined,
      },
      orderBy: { createdAtPlatform: "desc" },
    });

    return rows.map((row) => ({
      id: row.id,
      externalId: row.externalId,
      authorUsername: row.authorUsername,
      text: row.text,
      createdAtPlatform: row.createdAtPlatform,
    }));
  }

  /**
   * POST /{ig-user-id}/messages (Instagram Messaging API / Private Replies)
   */
  async sendDirectMessage(input: SendDmInput): Promise<SendDmResultDTO> {
    const { token, igUserId, apiBase } = await this.getAuthContext(input.accountId);
    const now = new Date();

    let externalCommentId: string | undefined;
    if (input.commentId) {
      const c = await db.comment.findUnique({ where: { id: input.commentId } });
      externalCommentId = c?.externalId;
    }

    let finalBody = input.body;
    if (input.linkId) {
      const link = await db.link.findUnique({ where: { id: input.linkId } });
      if (link?.destinationUrl && !finalBody.includes(link.destinationUrl)) {
        finalBody = `${finalBody.trim()}\n\n🔗 ${link.destinationUrl}`;
      }
    }

    let success = false;
    const isSimulated = externalCommentId?.startsWith("sim_") || !externalCommentId;

    if (!isSimulated && externalCommentId) {
      try {
        const endpoint = apiBase.includes("instagram.com") ? "me/messages" : `${igUserId}/messages`;
        const url = new URL(`${apiBase}/${endpoint}`);
        url.searchParams.set("access_token", token);

        const res = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { comment_id: externalCommentId },
            message: { text: finalBody },
          }),
        });

        const json = await res.json();
        if (res.ok && (json.message_id || json.recipient_id)) {
          success = true;
          console.log("[AutoDM] Meta API SendDM success:", json);
        } else {
          console.error("Meta Graph API SendDM response error:", json);
        }
      } catch (err) {
        console.error("Meta Graph API SendDM network exception:", err);
      }
    } else {
      // In simulated testing mode, treat as successful delivered run
      console.log(`[AutoDM] Simulated DM sent to @${input.toUsername}: "${finalBody}"`);
      success = true;
    }

    const status = success ? "DM_DELIVERED" : "DM_FAILED";
    const run = await db.automationRun.create({
      data: {
        automationId: input.automationId,
        commentId: input.commentId,
        triggeredAt: now,
        dmSentAt: success ? now : null,
        dmDeliveredAt: success ? now : null,
        status,
      },
    });

    return {
      automationRunId: run.id,
      status: success ? "DM_SENT" : "DM_FAILED",
      sentAt: now,
    };
  }

  /**
   * POST /{comment-id}/replies
   */
  async replyToComment(commentId: string, text: string): Promise<void> {
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });
    if (!comment) return;

    if (comment.externalId && comment.post) {
      try {
        const { token, apiBase } = await this.getAuthContext(comment.post.socialAccountId);
        const url = new URL(`${apiBase}/${comment.externalId}/replies`);
        url.searchParams.set("access_token", token);

        const res = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ message: text }),
        });

        if (!res.ok) {
          const errData = await res.json();
          console.error("Meta Graph API replyToComment failed:", errData);
        }
      } catch (err) {
        console.error("Meta Graph API replyToComment exception:", err);
      }
    }

    await db.comment.update({
      where: { id: commentId },
      data: { isFromAutomationReply: true },
    });
  }

  /**
   * GET /{ig-user-id}?fields=id (Validates access token status)
   */
  async verifyConnection(accountId: string): Promise<ConnectionStatusDTO> {
    try {
      const { token, igUserId, apiBase } = await this.getAuthContext(accountId);
      const url = new URL(`${apiBase}/${igUserId}`);
      url.searchParams.set("fields", "id");
      url.searchParams.set("access_token", token);

      const res = await fetch(url.toString());
      if (res.ok) {
        return { ok: true };
      }

      const json = await res.json();
      const message = json.error?.message || "Token verification failed";
      return { ok: false, error: message };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Connection verification failed" };
    }
  }
}
