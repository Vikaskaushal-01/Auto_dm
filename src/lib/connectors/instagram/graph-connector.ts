import {
  prisma,
  type Comment,
  type FollowerSnapshot,
  type Post,
} from "@/lib/prisma";
import { decryptToken } from "@/lib/security/encryption";
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

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

interface IGGraphMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
}

interface IGGraphComment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
}

export class GraphAPIInstagramConnector implements InstagramConnector {
  private async getAccountAndToken(accountId: string) {
    const account = await prisma.socialAccount.findUniqueOrThrow({
      where: { id: accountId },
      include: { connection: true, profile: true },
    });

    if (!account.connection?.accessToken) {
      throw new Error(`Social account ${accountId} does not have an active access token.`);
    }

    const token = decryptToken(account.connection.accessToken);
    return { account, token, externalId: account.externalAccountId };
  }

  async getProfile(accountId: string): Promise<InstagramProfileDTO> {
    try {
      const { account, token, externalId } = await this.getAccountAndToken(accountId);
      const url = `${GRAPH_BASE}/${externalId}?fields=username,name,followers_count,follows_count,media_count,biography,website,profile_picture_url&access_token=${token}`;
      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();
        const followersCount = data.followers_count ?? 0;
        const followingCount = data.follows_count ?? 0;
        const mediaCount = data.media_count ?? 0;
        const bio = data.biography ?? null;
        const website = data.website ?? null;
        const avatarUrl = data.profile_picture_url ?? account.avatarUrl;

        // Cache back to DB
        await prisma.$transaction([
          prisma.socialAccount.update({
            where: { id: accountId },
            data: {
              displayName: data.name ?? account.displayName,
              avatarUrl,
            },
          }),
          prisma.profile.upsert({
            where: { socialAccountId: accountId },
            update: { followersCount, followingCount, mediaCount, bio, website, asOf: new Date() },
            create: { socialAccountId: accountId, followersCount, followingCount, mediaCount, bio, website },
          }),
        ]);

        return {
          accountId,
          username: data.username ?? account.username,
          displayName: data.name ?? account.displayName,
          avatarUrl,
          followersCount,
          followingCount,
          mediaCount,
          bio,
          website,
        };
      }
    } catch (err) {
      console.warn("Graph API getProfile fallback to DB:", err);
    }

    // Fallback to local DB record
    const account = await prisma.socialAccount.findUniqueOrThrow({
      where: { id: accountId },
      include: { profile: true },
    });
    const mediaCount = await prisma.post.count({ where: { socialAccountId: accountId } });
    return {
      accountId: account.id,
      username: account.username,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      followersCount: account.profile?.followersCount ?? 0,
      followingCount: account.profile?.followingCount ?? 0,
      mediaCount,
      bio: account.profile?.bio ?? null,
      website: account.profile?.website ?? null,
    };
  }

  async getFollowerHistory(accountId: string, range: DateRange): Promise<FollowerHistoryPointDTO[]> {
    // Read persisted snapshots from DB (synced daily)
    const snapshots = await prisma.followerSnapshot.findMany({
      where: {
        socialAccountId: accountId,
        snapshotDate: { gte: range.start, lte: range.end },
      },
      orderBy: { snapshotDate: "asc" },
    });

    return snapshots.map((s: FollowerSnapshot) => ({
      date: s.snapshotDate,
      followersCount: s.followersCount,
      gained: s.gained,
      lost: s.lost,
      net: s.net,
    }));
  }

  async getPosts(
    accountId: string,
    opts?: { type?: PostTypeDTO; since?: Date },
  ): Promise<PostDTO[]> {
    try {
      const { token, externalId } = await this.getAccountAndToken(accountId);
      const url = `${GRAPH_BASE}/${externalId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&access_token=${token}&limit=50`;
      const res = await fetch(url);

      if (res.ok) {
        const json = await res.json();
        const mediaList: IGGraphMedia[] = json.data ?? [];

        // Upsert fetched posts into DB
        for (const m of mediaList) {
          const type: PostTypeDTO =
            m.media_type === "VIDEO" ? "REEL" : m.media_type === "CAROUSEL_ALBUM" ? "CAROUSEL" : "IMAGE";
          await prisma.post.upsert({
            where: { id: `ig_${m.id}` },
            update: {
              caption: m.caption ?? null,
              mediaUrl: m.media_url ?? null,
              thumbnailUrl: m.thumbnail_url ?? m.media_url ?? null,
              permalink: m.permalink ?? null,
            },
            create: {
              id: `ig_${m.id}`,
              socialAccountId: accountId,
              externalId: m.id,
              type,
              caption: m.caption ?? null,
              mediaUrl: m.media_url ?? null,
              thumbnailUrl: m.thumbnail_url ?? m.media_url ?? null,
              permalink: m.permalink ?? null,
              publishedAt: new Date(m.timestamp),
            },
          });
        }
      }
    } catch (err) {
      console.warn("Graph API getPosts error, falling back to DB:", err);
    }

    const posts = await prisma.post.findMany({
      where: {
        socialAccountId: accountId,
        type: opts?.type,
        publishedAt: opts?.since ? { gte: opts.since } : undefined,
      },
      orderBy: { publishedAt: "desc" },
    });

    return posts.map((p: Post) => ({
      id: p.id,
      externalId: p.externalId,
      type: p.type as PostTypeDTO,
      caption: p.caption,
      mediaUrl: p.mediaUrl,
      thumbnailUrl: p.thumbnailUrl,
      permalink: p.permalink,
      publishedAt: p.publishedAt,
    }));
  }

  async getReelInsights(postId: string, _range?: DateRange): Promise<ReelInsightsDTO> {
    void _range;
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        socialAccount: { include: { connection: true } },
        contentMetrics: { orderBy: { metricDate: "desc" }, take: 1 },
      },
    });

    if (post?.socialAccount.connection?.accessToken) {
      try {
        const token = decryptToken(post.socialAccount.connection.accessToken);
        const url = `${GRAPH_BASE}/${post.externalId}/insights?metric=reach,saved,shares,comments,likes&access_token=${token}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const metricsMap: Record<string, number> = {};
          for (const item of json.data ?? []) {
            metricsMap[item.name] = item.values?.[0]?.value ?? 0;
          }
          return {
            postId,
            views: metricsMap["reach"] ?? 0,
            reach: metricsMap["reach"] ?? 0,
            impressions: metricsMap["reach"] ?? 0,
            likes: metricsMap["likes"] ?? 0,
            comments: metricsMap["comments"] ?? 0,
            shares: metricsMap["shares"] ?? 0,
            saves: metricsMap["saved"] ?? 0,
            watchTimeSeconds: 0,
            engagementRate: 0,
            profileVisits: 0,
            followersGained: 0,
            linkClicks: 0,
          };
        }
      } catch (err) {
        console.warn("Reel insights fetch failed, falling back to DB:", err);
      }
    }

    const latest = post?.contentMetrics?.[0];
    return {
      postId,
      views: latest?.views ?? 0,
      reach: latest?.reach ?? 0,
      impressions: latest?.impressions ?? 0,
      likes: latest?.likes ?? 0,
      comments: latest?.comments ?? 0,
      shares: latest?.shares ?? 0,
      saves: latest?.saves ?? 0,
      watchTimeSeconds: latest?.watchTimeSeconds ?? 0,
      engagementRate: latest?.engagementRate ?? 0,
      profileVisits: latest?.profileVisits ?? 0,
      followersGained: latest?.followersGained ?? 0,
      linkClicks: latest?.linkClicks ?? 0,
    };
  }

  async getComments(postId: string, opts?: { since?: Date }): Promise<CommentDTO[]> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: { include: { connection: true } } },
    });

    if (post?.socialAccount.connection?.accessToken) {
      try {
        const token = decryptToken(post.socialAccount.connection.accessToken);
        const url = `${GRAPH_BASE}/${post.externalId}/comments?fields=id,username,text,timestamp&access_token=${token}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const comments: IGGraphComment[] = json.data ?? [];
          return comments.map((c: IGGraphComment) => ({
            id: c.id,
            externalId: c.id,
            authorUsername: c.username,
            text: c.text,
            createdAtPlatform: new Date(c.timestamp),
          }));
        }
      } catch (err) {
        console.warn("Failed to fetch live comments:", err);
      }
    }

    const rows = await prisma.comment.findMany({
      where: {
        postId,
        createdAtPlatform: opts?.since ? { gte: opts.since } : undefined,
      },
      orderBy: { createdAtPlatform: "desc" },
    });

    return rows.map((c: Comment) => ({
      id: c.id,
      externalId: c.externalId,
      authorUsername: c.authorUsername,
      text: c.text,
      createdAtPlatform: c.createdAtPlatform,
    }));
  }

  async sendDirectMessage(input: SendDmInput): Promise<SendDmResultDTO> {
    const { token, externalId } = await this.getAccountAndToken(input.accountId);

    // Meta Instagram Messaging API Send Endpoint
    const sendUrl = `${GRAPH_BASE}/${externalId}/messages`;
    let dmSuccess = false;

    try {
      const bodyPayload: Record<string, unknown> = {
        recipient: { username: input.toUsername },
        message: { text: input.body },
      };

      if (input.mediaUrl) {
        bodyPayload.message = {
          attachment: {
            type: "image",
            payload: { url: input.mediaUrl },
          },
        };
      }

      const res = await fetch(sendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      if (res.ok) {
        dmSuccess = true;
      } else {
        const errorJson = await res.json();
        console.error("Meta sendDirectMessage error response:", errorJson);
      }
    } catch (err) {
      console.error("Meta sendDirectMessage exception:", err);
    }

    const run = await prisma.automationRun.create({
      data: {
        automationId: input.automationId,
        commentId: input.commentId ?? null,
        status: dmSuccess ? "DM_SENT" : "DM_FAILED",
        dmSentAt: dmSuccess ? new Date() : null,
      },
    });

    return {
      automationRunId: run.id,
      status: dmSuccess ? "DM_SENT" : "DM_FAILED",
      sentAt: run.dmSentAt ?? new Date(),
    };
  }

  async replyToComment(commentId: string, text: string): Promise<void> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: { socialAccount: { include: { connection: true } } },
        },
      },
    });

    if (!comment?.post.socialAccount.connection?.accessToken) {
      console.warn("Cannot reply to comment: no access token found for account");
      return;
    }

    const token = decryptToken(comment.post.socialAccount.connection.accessToken);
    const replyUrl = `${GRAPH_BASE}/${comment.externalId}/replies`;

    try {
      const res = await fetch(replyUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        console.error("Meta replyToComment error:", errJson);
      }
    } catch (err) {
      console.error("Meta replyToComment exception:", err);
    }
  }

  async verifyConnection(accountId: string): Promise<ConnectionStatusDTO> {
    try {
      const { externalId, token } = await this.getAccountAndToken(accountId);
      const res = await fetch(`${GRAPH_BASE}/${externalId}?fields=id&access_token=${token}`);
      if (!res.ok) {
        const errJson = await res.json();
        return { ok: false, error: errJson.error?.message ?? "Token invalid or expired" };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection check failed" };
    }
  }
}
