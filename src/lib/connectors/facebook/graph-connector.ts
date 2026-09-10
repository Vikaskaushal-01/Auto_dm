import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/security/encryption";
import type {
  ConnectionStatusDTO,
  DateRange,
  FacebookCommentDTO,
  FacebookConnector,
  FacebookPageProfileDTO,
  FacebookPostDTO,
  FacebookPostInsightsDTO,
  SendMessengerInput,
  SendResultDTO,
} from "./types";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

interface FBGraphPost {
  id: string;
  message?: string;
  full_picture?: string;
  permalink_url?: string;
  created_time: string;
}

interface FBGraphComment {
  id: string;
  message?: string;
  created_time: string;
  from?: { name?: string };
}

export class GraphAPIFacebookConnector implements FacebookConnector {
  private async getAccountAndToken(accountId: string) {
    const account = await prisma.socialAccount.findUniqueOrThrow({
      where: { id: accountId },
      include: { connection: true, profile: true },
    });

    if (!account.connection?.accessToken) {
      throw new Error(`Facebook account ${accountId} does not have an active access token.`);
    }

    const token = decryptToken(account.connection.accessToken);
    return { account, token, externalId: account.externalAccountId };
  }

  async getPageProfile(accountId: string): Promise<FacebookPageProfileDTO> {
    try {
      const { account, token, externalId } = await this.getAccountAndToken(accountId);
      const url = `${GRAPH_BASE}/${externalId}?fields=name,fan_count,about,website,picture{url}&access_token=${token}`;
      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();
        const avatarUrl = data.picture?.data?.url ?? account.avatarUrl;
        const followersCount = data.fan_count ?? 0;

        await prisma.socialAccount.update({
          where: { id: accountId },
          data: { displayName: data.name ?? account.displayName, avatarUrl },
        });

        return {
          accountId,
          pageName: data.name ?? account.displayName ?? account.username,
          avatarUrl,
          followersCount,
          about: data.about ?? null,
          website: data.website ?? null,
        };
      }
    } catch (err) {
      console.warn("Facebook getPageProfile fallback to DB:", err);
    }

    const account = await prisma.socialAccount.findUniqueOrThrow({
      where: { id: accountId },
      include: { profile: true },
    });

    return {
      accountId: account.id,
      pageName: account.displayName ?? account.username,
      avatarUrl: account.avatarUrl,
      followersCount: account.profile?.followersCount ?? 0,
      about: account.profile?.bio ?? null,
      website: account.profile?.website ?? null,
    };
  }

  async getPosts(accountId: string, opts?: { since?: Date }): Promise<FacebookPostDTO[]> {
    try {
      const { token, externalId } = await this.getAccountAndToken(accountId);
      const url = `${GRAPH_BASE}/${externalId}/posts?fields=id,message,full_picture,permalink_url,created_time&access_token=${token}&limit=25`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const postsList: FBGraphPost[] = json.data ?? [];

        for (const p of postsList) {
          await prisma.post.upsert({
            where: { id: `fb_${p.id}` },
            update: {
              caption: p.message ?? null,
              mediaUrl: p.full_picture ?? null,
              permalink: p.permalink_url ?? null,
            },
            create: {
              id: `fb_${p.id}`,
              socialAccountId: accountId,
              externalId: p.id,
              type: "IMAGE",
              caption: p.message ?? null,
              mediaUrl: p.full_picture ?? null,
              permalink: p.permalink_url ?? null,
              publishedAt: new Date(p.created_time),
            },
          });
        }
      }
    } catch (err) {
      console.warn("Facebook getPosts fallback to DB:", err);
    }

    const posts = await prisma.post.findMany({
      where: {
        socialAccountId: accountId,
        ...(opts?.since ? { publishedAt: { gte: opts.since } } : {}),
      },
      orderBy: { publishedAt: "desc" },
    });

    return posts.map((p) => ({
      id: p.id,
      externalId: p.externalId,
      type: "PHOTO",
      message: p.caption,
      mediaUrl: p.mediaUrl,
      permalink: p.permalink,
      publishedAt: p.publishedAt,
    }));
  }

  async getPostInsights(postId: string, _range?: DateRange): Promise<FacebookPostInsightsDTO> {
    void _range;
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        socialAccount: { include: { connection: true } },
        contentMetrics: { orderBy: { metricDate: "desc" }, take: 1 },
      },
    });

    const latest = post?.contentMetrics?.[0];
    return {
      postId,
      reach: latest?.reach ?? 0,
      impressions: latest?.impressions ?? 0,
      likes: latest?.likes ?? 0,
      comments: latest?.comments ?? 0,
      shares: latest?.shares ?? 0,
      engagementRate: latest?.engagementRate ?? 0,
    };
  }

  async getComments(postId: string, opts?: { since?: Date }): Promise<FacebookCommentDTO[]> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: { include: { connection: true } } },
    });

    if (post?.socialAccount.connection?.accessToken) {
      try {
        const token = decryptToken(post.socialAccount.connection.accessToken);
        const url = `${GRAPH_BASE}/${post.externalId}/comments?fields=id,from,message,created_time&access_token=${token}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const comments: FBGraphComment[] = json.data ?? [];
          return comments.map((c) => ({
            id: c.id,
            externalId: c.id,
            authorName: c.from?.name ?? "Facebook User",
            text: c.message ?? "",
            createdAtPlatform: new Date(c.created_time),
          }));
        }
      } catch (err) {
        console.warn("Facebook getComments fallback:", err);
      }
    }

    const rows = await prisma.comment.findMany({
      where: {
        postId,
        ...(opts?.since ? { createdAtPlatform: { gte: opts.since } } : {}),
      },
      orderBy: { createdAtPlatform: "desc" },
    });

    return rows.map((c) => ({
      id: c.id,
      externalId: c.externalId,
      authorName: c.authorUsername,
      text: c.text,
      createdAtPlatform: c.createdAtPlatform,
    }));
  }

  async sendMessengerMessage(input: SendMessengerInput): Promise<SendResultDTO> {
    const { token, externalId } = await this.getAccountAndToken(input.accountId);
    let dmSuccess = false;

    try {
      const sendUrl = `${GRAPH_BASE}/${externalId}/messages`;
      const res = await fetch(sendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: input.commentId ?? externalId },
          message: { text: input.body },
        }),
      });

      if (res.ok) {
        dmSuccess = true;
      }
    } catch (err) {
      console.error("Facebook sendMessengerMessage exception:", err);
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
      return;
    }

    const token = decryptToken(comment.post.socialAccount.connection.accessToken);
    const replyUrl = `${GRAPH_BASE}/${comment.externalId}/comments`;

    try {
      await fetch(replyUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });
    } catch (err) {
      console.error("Facebook replyToComment error:", err);
    }
  }

  async verifyConnection(accountId: string): Promise<ConnectionStatusDTO> {
    try {
      const { externalId, token } = await this.getAccountAndToken(accountId);
      const res = await fetch(`${GRAPH_BASE}/${externalId}?fields=id&access_token=${token}`);
      if (!res.ok) {
        return { ok: false, error: "Facebook token invalid or expired" };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection check failed" };
    }
  }
}
