import type { PrismaClient } from "../../src/generated/prisma/client";
import { buildScaledDailySeries, dateForIndex, last90in30DaySegments, NUM_DAYS } from "./series";

// Headline targets mirror the canonical demo dataset described in the
// product spec (section 66/68) so the seeded dashboard matches it closely.
const REACH_CURRENT_30D = 1_820_000;
const REACH_GROWTH_RATIO = 1.142; // +14.2%
const PROFILE_VISITS_CURRENT_30D = 24_820;
const PROFILE_VISITS_GROWTH_RATIO = 1.184; // +18.4%
const WEBSITE_CLICKS_CURRENT_30D = 3_480;
const WEBSITE_CLICKS_GROWTH_RATIO = 1.096; // +9.6%
const FOLLOWERS_CURRENT = 125_430;
const FOLLOWERS_NET_CURRENT_30D = 2_840; // +2.31% vs previous 30d (122,590)
const ENGAGEMENT_CURRENT_PCT = 8.4;
const ENGAGEMENT_MID_PCT = 7.3;
const ENGAGEMENT_OLDEST_PCT = 6.6;

export async function seedFollowerHistory(
  prisma: PrismaClient,
  workspaceId: string,
  socialAccountId: string,
  rng: () => number,
) {
  // --- Followers: cumulative walk built from a scaled daily "net" series ---
  const netSegments = last90in30DaySegments(FOLLOWERS_NET_CURRENT_30D, 1.15);
  const netSeries = buildScaledDailySeries(
    rng,
    NUM_DAYS,
    FOLLOWERS_NET_CURRENT_30D / 30,
    0.7,
    [netSegments.oldest, netSegments.mid, netSegments.current],
  ).map((v, i) => (i % 11 === 0 ? -Math.round(v * 0.4) : v)); // occasional net-loss days

  const totalNet = netSeries.reduce((a, b) => a + b, 0);
  const startFollowers = FOLLOWERS_CURRENT - totalNet;

  const lostSeries = buildScaledDailySeries(rng, NUM_DAYS, 45, 0.5, []);
  const followingSeries = Array.from({ length: NUM_DAYS }, (_, i) =>
    Math.round(590 + (612 - 590) * (i / (NUM_DAYS - 1)) + (rng() - 0.5) * 6),
  );

  let runningFollowers = startFollowers;
  const followerRows: {
    snapshotDate: Date;
    followersCount: number;
    followingCount: number;
    gained: number;
    lost: number;
    net: number;
  }[] = [];

  for (let i = 0; i < NUM_DAYS; i++) {
    const lost = lostSeries[i];
    let net = netSeries[i];
    let gained = lost + net;
    if (gained < 0) {
      gained = 0;
      net = gained - lost;
    }
    runningFollowers += net;
    followerRows.push({
      snapshotDate: dateForIndex(i),
      followersCount: runningFollowers,
      followingCount: followingSeries[i],
      gained,
      lost,
      net,
    });
  }
  // Force exact reconciliation on the final day so the headline number matches precisely.
  followerRows[NUM_DAYS - 1].followersCount = FOLLOWERS_CURRENT;

  await prisma.followerSnapshot.deleteMany({ where: { socialAccountId } });
  await prisma.followerSnapshot.createMany({
    data: followerRows.map((r) => ({ socialAccountId, ...r })),
  });

  await prisma.profile.update({
    where: { socialAccountId },
    data: {
      followersCount: FOLLOWERS_CURRENT,
      followingCount: followerRows[NUM_DAYS - 1].followingCount,
      profileVisits30d: PROFILE_VISITS_CURRENT_30D,
    },
  });

  // --- Daily dashboard metrics stored generically in MetricSnapshot ---
  const reachSegments = last90in30DaySegments(REACH_CURRENT_30D, REACH_GROWTH_RATIO);
  const reachSeries = buildScaledDailySeries(rng, NUM_DAYS, REACH_CURRENT_30D / 30, 0.35, [
    reachSegments.oldest,
    reachSegments.mid,
    reachSegments.current,
  ]);
  const impressionsSeries = reachSeries.map((v) => Math.round(v * 1.35));

  const visitsSegments = last90in30DaySegments(
    PROFILE_VISITS_CURRENT_30D,
    PROFILE_VISITS_GROWTH_RATIO,
  );
  const visitsSeries = buildScaledDailySeries(
    rng,
    NUM_DAYS,
    PROFILE_VISITS_CURRENT_30D / 30,
    0.4,
    [visitsSegments.oldest, visitsSegments.mid, visitsSegments.current],
  );

  const clicksSegments = last90in30DaySegments(
    WEBSITE_CLICKS_CURRENT_30D,
    WEBSITE_CLICKS_GROWTH_RATIO,
  );
  const clicksSeries = buildScaledDailySeries(
    rng,
    NUM_DAYS,
    WEBSITE_CLICKS_CURRENT_30D / 30,
    0.45,
    [clicksSegments.oldest, clicksSegments.mid, clicksSegments.current],
  );

  const metricRows: {
    workspaceId: string;
    metricName: string;
    value: number;
    unit: "COUNT" | "PERCENT";
    timestamp: Date;
    accountId: string;
  }[] = [];

  for (let i = 0; i < NUM_DAYS; i++) {
    const date = dateForIndex(i);
    const segment = i < 30 ? 0 : i < 60 ? 1 : 2;
    const engagementBase =
      segment === 2 ? ENGAGEMENT_CURRENT_PCT : segment === 1 ? ENGAGEMENT_MID_PCT : ENGAGEMENT_OLDEST_PCT;
    const engagementRate = Math.max(0, engagementBase + (rng() - 0.5) * 1.2);

    metricRows.push(
      { workspaceId, metricName: "reach", value: reachSeries[i], unit: "COUNT", timestamp: date, accountId: socialAccountId },
      { workspaceId, metricName: "impressions", value: impressionsSeries[i], unit: "COUNT", timestamp: date, accountId: socialAccountId },
      { workspaceId, metricName: "profile_visits", value: visitsSeries[i], unit: "COUNT", timestamp: date, accountId: socialAccountId },
      { workspaceId, metricName: "website_clicks", value: clicksSeries[i], unit: "COUNT", timestamp: date, accountId: socialAccountId },
      { workspaceId, metricName: "engagement_rate", value: Number(engagementRate.toFixed(2)), unit: "PERCENT", timestamp: date, accountId: socialAccountId },
    );
  }

  await prisma.metricSnapshot.deleteMany({
    where: {
      workspaceId,
      accountId: socialAccountId,
      metricName: { in: ["reach", "impressions", "profile_visits", "website_clicks", "engagement_rate"] },
    },
  });
  await prisma.metricSnapshot.createMany({ data: metricRows });

  return { followerRows, reachSeries, impressionsSeries, visitsSeries, clicksSeries };
}
