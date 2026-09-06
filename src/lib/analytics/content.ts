import { prisma } from "@/lib/prisma";
import type { DateRange } from "./periods";

export interface ContentSummary {
  id: string;
  type: string;
  caption: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  publishedAt: Date;
  views: number;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watchTimeSeconds: number;
  engagementRate: number;
  profileVisits: number;
  followersGained: number;
  linkClicks: number;
  hasAutomation: boolean;
}

/** Per-post metric sums over `range`, for every post on the account (posts with no activity in-range come back all-zero, not omitted). */
export async function getContentSummaries(
  accountId: string,
  range: DateRange,
): Promise<ContentSummary[]> {
  const posts = await prisma.post.findMany({
    where: { socialAccountId: accountId },
    include: {
      contentMetrics: { where: { metricDate: { gte: range.start, lte: range.end } } },
      automationTargets: { select: { id: true } },
    },
    orderBy: { publishedAt: "desc" },
  });

  return posts.map((post) => {
    const m = post.contentMetrics;
    const sum = (pick: (row: (typeof m)[number]) => number) => m.reduce((acc, row) => acc + pick(row), 0);
    const engagementRate = m.length > 0 ? sum((r) => r.engagementRate) / m.length : 0;

    return {
      id: post.id,
      type: post.type,
      caption: post.caption,
      thumbnailUrl: post.thumbnailUrl,
      permalink: post.permalink,
      publishedAt: post.publishedAt,
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
      hasAutomation: post.automationTargets.length > 0,
    };
  });
}

export async function getTopContent(
  accountId: string,
  range: DateRange,
  limit = 5,
  sortBy: keyof ContentSummary = "views",
): Promise<ContentSummary[]> {
  const summaries = await getContentSummaries(accountId, range);
  return summaries
    .sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number))
    .slice(0, limit);
}
