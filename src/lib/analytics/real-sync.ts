import { prisma } from "@/lib/prisma";
import { getInstagramConnector } from "@/lib/connectors/instagram";

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export interface RealSyncResult {
  ok: boolean;
  error?: string;
  followersCount?: number;
  postsSynced?: number;
  metricsWritten?: number;
}

/**
 * Pulls today's real numbers from the Meta Graph API for one live Instagram
 * account and records them as a single dated row (FollowerSnapshot,
 * ContentMetric). Every field written here comes straight from the API
 * response for the current call — nothing is interpolated, backfilled, or
 * distributed across past days. Safe to call repeatedly in the same day
 * (upserts on the unique [accountId/postId, date] key).
 */
export async function syncRealInstagramAnalytics(socialAccountId: string): Promise<RealSyncResult> {
  const account = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
    include: { connection: true },
  });

  if (!account || account.platform !== "INSTAGRAM") {
    return { ok: false, error: "Not an Instagram account." };
  }
  if (account.connection?.mode !== "LIVE") {
    return { ok: false, error: "Account is not connected in Live mode." };
  }

  const connector = await getInstagramConnector(account.id);
  const today = startOfUtcDay(new Date());

  const profile = await connector.getProfile(account.id);

  const priorSnapshot = await prisma.followerSnapshot.findFirst({
    where: { socialAccountId: account.id, snapshotDate: { lt: today } },
    orderBy: { snapshotDate: "desc" },
  });

  const net = priorSnapshot ? profile.followersCount - priorSnapshot.followersCount : 0;

  await prisma.followerSnapshot.upsert({
    where: { socialAccountId_snapshotDate: { socialAccountId: account.id, snapshotDate: today } },
    update: {
      followersCount: profile.followersCount,
      followingCount: profile.followingCount,
      gained: Math.max(0, net),
      lost: Math.max(0, -net),
      net,
    },
    create: {
      socialAccountId: account.id,
      snapshotDate: today,
      followersCount: profile.followersCount,
      followingCount: profile.followingCount,
      gained: Math.max(0, net),
      lost: Math.max(0, -net),
      net,
    },
  });

  const posts = await connector.getPosts(account.id);

  let metricsWritten = 0;
  for (const post of posts) {
    const insights = await connector.getReelInsights(post.id);

    await prisma.contentMetric.upsert({
      where: { postId_metricDate: { postId: post.id, metricDate: today } },
      update: {
        views: insights.views,
        reach: insights.reach,
        impressions: insights.impressions,
        likes: insights.likes,
        comments: insights.comments,
        shares: insights.shares,
        saves: insights.saves,
        watchTimeSeconds: insights.watchTimeSeconds,
        engagementRate: insights.engagementRate,
        profileVisits: insights.profileVisits,
        followersGained: insights.followersGained,
        linkClicks: insights.linkClicks,
      },
      create: {
        postId: post.id,
        metricDate: today,
        views: insights.views,
        reach: insights.reach,
        impressions: insights.impressions,
        likes: insights.likes,
        comments: insights.comments,
        shares: insights.shares,
        saves: insights.saves,
        watchTimeSeconds: insights.watchTimeSeconds,
        engagementRate: insights.engagementRate,
        profileVisits: insights.profileVisits,
        followersGained: insights.followersGained,
        linkClicks: insights.linkClicks,
      },
    });
    metricsWritten++;
  }

  await prisma.platformConnection.update({
    where: { socialAccountId: account.id },
    data: { lastSyncedAt: new Date(), lastSyncStatus: "SUCCESS" },
  });

  return {
    ok: true,
    followersCount: profile.followersCount,
    postsSynced: posts.length,
    metricsWritten,
  };
}

/** Runs the real sync for every live-connected Instagram account. Used by the daily cron route. */
export async function syncAllLiveInstagramAccounts(): Promise<Array<{ socialAccountId: string; username: string } & RealSyncResult>> {
  const accounts = await prisma.socialAccount.findMany({
    where: { platform: "INSTAGRAM", isDemo: false, connection: { mode: "LIVE" } },
    select: { id: true, username: true },
  });

  const results = [];
  for (const account of accounts) {
    const result = await syncRealInstagramAnalytics(account.id);
    results.push({ socialAccountId: account.id, username: account.username, ...result });
  }
  return results;
}
