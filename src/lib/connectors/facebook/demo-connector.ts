import { prisma } from "@/lib/prisma";
import type {
  ConnectionStatusDTO,
  DateRange,
  FacebookCommentDTO,
  FacebookConnector,
  FacebookPageProfileDTO,
  FacebookPostDTO,
  FacebookPostInsightsDTO,
  FacebookPostTypeDTO,
  SendMessengerInput,
  SendResultDTO,
} from "./types";

// Facebook posts/comments reuse the same Post/Comment/ContentMetric tables
// as Instagram (they're platform-scoped via socialAccountId already) rather
// than forking the content schema — only the display type label differs.
function toFacebookPostType(dbType: string): FacebookPostTypeDTO {
  switch (dbType) {
    case "REEL":
      return "VIDEO";
    case "IMAGE":
    case "CAROUSEL":
      return "PHOTO";
    default:
      return "POST";
  }
}

export class DemoFacebookConnector implements FacebookConnector {
  async getPageProfile(accountId: string): Promise<FacebookPageProfileDTO> {
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
    const rows = await prisma.post.findMany({
      where: {
        socialAccountId: accountId,
        publishedAt: opts?.since ? { gte: opts.since } : undefined,
      },
      orderBy: { publishedAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      externalId: row.externalId,
      type: toFacebookPostType(row.type),
      message: row.caption,
      mediaUrl: row.mediaUrl,
      permalink: row.permalink,
      publishedAt: row.publishedAt,
    }));
  }

  async getPostInsights(postId: string, range?: DateRange): Promise<FacebookPostInsightsDTO> {
    const rows = await prisma.contentMetric.findMany({
      where: { postId, metricDate: range ? { gte: range.start, lte: range.end } : undefined },
    });
    const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + pick(r), 0);
    const engagementRate = rows.length > 0 ? sum((r) => r.engagementRate) / rows.length : 0;
    return {
      postId,
      reach: sum((r) => r.reach),
      impressions: sum((r) => r.impressions),
      likes: sum((r) => r.likes),
      comments: sum((r) => r.comments),
      shares: sum((r) => r.shares),
      engagementRate,
    };
  }

  async getComments(postId: string, opts?: { since?: Date }): Promise<FacebookCommentDTO[]> {
    const rows = await prisma.comment.findMany({
      where: { postId, createdAtPlatform: opts?.since ? { gte: opts.since } : undefined },
      orderBy: { createdAtPlatform: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      externalId: row.externalId,
      authorName: row.authorUsername,
      text: row.text,
      createdAtPlatform: row.createdAtPlatform,
    }));
  }

  async sendMessengerMessage(input: SendMessengerInput): Promise<SendResultDTO> {
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
    await prisma.comment.update({ where: { id: commentId }, data: { isFromAutomationReply: true } });
  }

  async verifyConnection(accountId: string): Promise<ConnectionStatusDTO> {
    const connection = await prisma.platformConnection.findUnique({ where: { socialAccountId: accountId } });
    if (!connection) return { ok: false, error: "No platform connection found" };
    return { ok: true };
  }
}
