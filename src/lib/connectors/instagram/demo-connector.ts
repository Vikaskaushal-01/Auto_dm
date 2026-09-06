import { prisma } from "@/lib/prisma";
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

/**
 * Implements InstagramConnector against seeded Postgres data — not mocked
 * JSON, the same database the rest of the app reads, so demo mode stays
 * internally consistent across every page.
 */
export class DemoInstagramConnector implements InstagramConnector {
  async getProfile(accountId: string): Promise<InstagramProfileDTO> {
    const [account, mediaCount] = await Promise.all([
      prisma.socialAccount.findUniqueOrThrow({
        where: { id: accountId },
        include: { profile: true },
      }),
      prisma.post.count({ where: { socialAccountId: accountId } }),
    ]);
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

  async getFollowerHistory(
    accountId: string,
    range: DateRange,
  ): Promise<FollowerHistoryPointDTO[]> {
    const rows = await prisma.followerSnapshot.findMany({
      where: { socialAccountId: accountId, snapshotDate: { gte: range.start, lte: range.end } },
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

  async getPosts(
    accountId: string,
    opts?: { type?: PostTypeDTO; since?: Date },
  ): Promise<PostDTO[]> {
    const rows = await prisma.post.findMany({
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

  async getReelInsights(postId: string, range?: DateRange): Promise<ReelInsightsDTO> {
    const rows = await prisma.contentMetric.findMany({
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

  async getComments(postId: string, opts?: { since?: Date }): Promise<CommentDTO[]> {
    const rows = await prisma.comment.findMany({
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

  async sendDirectMessage(input: SendDmInput): Promise<SendDmResultDTO> {
    // Demo mode simulates a near-always-successful send (used by "Test flow"
    // style actions); a real connector would call the Graph API send-message
    // endpoint and reflect its actual delivery result here.
    const now = new Date();
    const run = await prisma.automationRun.create({
      data: {
        automationId: input.automationId,
        commentId: input.commentId,
        triggeredAt: now,
        dmSentAt: now,
        dmDeliveredAt: now,
        status: "DM_DELIVERED",
      },
    });
    return { automationRunId: run.id, status: "DM_SENT", sentAt: now };
  }

  async replyToComment(commentId: string, _text: string): Promise<void> {
    await prisma.comment.update({
      where: { id: commentId },
      data: { isFromAutomationReply: true },
    });
  }

  async verifyConnection(accountId: string): Promise<ConnectionStatusDTO> {
    const connection = await prisma.platformConnection.findUnique({
      where: { socialAccountId: accountId },
    });
    if (!connection) return { ok: false, error: "No platform connection found" };
    return { ok: true };
  }
}
