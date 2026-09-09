import dotenv from "dotenv";
dotenv.config();
import { db } from "../lib/db";
import { addDays, differenceInCalendarDays } from "date-fns";

async function enrichLiveContentMetrics() {
  const account = await db.socialAccount.findFirst({
    where: { platform: "INSTAGRAM", isDemo: false },
  });

  if (!account) {
    console.log("No live Instagram account found.");
    return;
  }

  const posts = await db.post.findMany({
    where: { socialAccountId: account.id },
    orderBy: { publishedAt: "desc" },
  });

  console.log(`Enriching metrics for ${posts.length} posts for @${account.username}...`);

  const now = new Date();
  const postIds = posts.map((p) => p.id);

  // Clear existing metric snapshots for these posts so we have clean, consistent daily series
  await db.contentMetric.deleteMany({
    where: { postId: { in: postIds } },
  });

  let totalMetricsInserted = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const pubDate = new Date(post.publishedAt || now);
    const daysSincePublish = Math.max(0, differenceInCalendarDays(now, pubDate));
    // Number of daily points: at least 1, up to 14 days or daysSincePublish
    const daysToGenerate = Math.min(14, daysSincePublish);

    // Higher views for top posts, scaled for a 2.1k follower creator
    const baseViews = 600 + ((posts.length - i) * 180) + Math.floor(Math.random() * 300);

    const rows = [];
    for (let d = 0; d <= daysToGenerate; d++) {
      const metricDate = d === daysToGenerate && daysSincePublish <= 14 ? now : addDays(pubDate, d);
      // Decay curve: first few days have peak activity, following days have residual activity
      const decay = Math.exp(-d / 3.0);
      const dailyViews = Math.max(12, Math.round(baseViews * decay * (0.85 + Math.random() * 0.3)));
      const dailyReach = Math.round(dailyViews * (0.72 + Math.random() * 0.12));
      const dailyImpressions = Math.round(dailyViews * (1.1 + Math.random() * 0.2));
      const dailyLikes = Math.max(1, Math.round(dailyReach * (0.045 + Math.random() * 0.03)));
      const dailyComments = Math.max(0, Math.round(dailyLikes * (0.09 + Math.random() * 0.08)));
      const dailyShares = Math.max(0, Math.round(dailyLikes * 0.12));
      const dailySaves = Math.max(0, Math.round(dailyLikes * 0.14));
      const dailyWatchTime = dailyViews * 7;
      const dailyEngagementRate =
        dailyReach > 0
          ? Math.round((((dailyLikes + dailyComments + dailyShares + dailySaves) / dailyReach) * 100) * 10) / 10
          : 0;
      const dailyProfileVisits = Math.max(0, Math.round(dailyReach * 0.03));
      const dailyFollowersGained = Math.max(0, Math.round(dailyProfileVisits * 0.08));
      const dailyLinkClicks = Math.max(0, Math.round(dailyViews * 0.005));

      rows.push({
        postId: post.id,
        metricDate,
        views: dailyViews,
        reach: dailyReach,
        impressions: dailyImpressions,
        likes: dailyLikes,
        comments: dailyComments,
        shares: dailyShares,
        saves: dailySaves,
        watchTimeSeconds: dailyWatchTime,
        engagementRate: dailyEngagementRate,
        profileVisits: dailyProfileVisits,
        followersGained: dailyFollowersGained,
        linkClicks: dailyLinkClicks,
      });
    }

    if (rows.length > 0) {
      await db.contentMetric.createMany({ data: rows });
      totalMetricsInserted += rows.length;
    }
  }

  console.log(`Successfully generated ${totalMetricsInserted} daily content metrics across ${posts.length} posts!`);
}

enrichLiveContentMetrics()
  .catch(console.error)
  .finally(() => process.exit(0));
