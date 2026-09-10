import type { PrismaClient } from "../generated-client";
import { addDays, differenceInCalendarDays } from "date-fns";
import { dateForIndex, NUM_DAYS } from "./series";

const CAPTIONS = [
  "Learn AI in 30 Days 🤖 — comment \"AI\" and I'll DM you the free roadmap",
  "3 AI tools that 10x'd my content output this month",
  "How I automate my Instagram DMs while I sleep 💤",
  "The AI prompt that changed how I write captions",
  "Stop doing this if you want AI to actually save you time",
  "My exact ChatGPT workflow for a week of content in 1 hour",
  "AI vs. human: I tested both for a week, here's what won",
  "5 free AI tools every creator should be using in 2026",
  "How I built an AutoDM funnel that generates leads on autopilot",
  "Behind the scenes: automating my creator business with AI",
  "The mistake 90% of creators make with AI (fix it today)",
  "Comment \"ML\" for my free machine learning starter guide",
  "This AI automation got me 800 new followers in a week",
  "Why I stopped manually replying to comments (AI does it now)",
  "A day in my life running an AI-automated content business",
  "Comment \"TEMPLATE\" for my free content calendar template",
  "The follow-up sequence that turned DMs into paying customers",
  "How creators are using AI to scale without burning out",
];

interface QualityTier {
  baseViews: number;
  isFlagship?: boolean;
}

function tierForIndex(i: number): QualityTier {
  if (i === 2) return { baseViews: 9500, isFlagship: true }; // "Learn AI in 30 Days" — the automated flagship reel
  if (i === 9) return { baseViews: 7200 }; // second automated reel ("ML Guide")
  if (i === 13) return { baseViews: 6100, isFlagship: true }; // viral spike reel
  return { baseViews: 800 + (i % 5) * 250 };
}

function decayMetricsForDay(dayOffset: number, baseViews: number, rng: () => number) {
  const decay = Math.exp(-dayOffset / 3.2);
  const noise = 1 + (rng() - 0.5) * 0.3;
  const views = Math.max(0, Math.round(baseViews * decay * noise * (dayOffset === 0 ? 6 : 1)));
  const reach = Math.round(views * (0.62 + rng() * 0.1));
  const impressions = Math.round(views * (1.15 + rng() * 0.15));
  const likes = Math.round(views * (0.05 + rng() * 0.02));
  const comments = Math.round(views * (0.012 + rng() * 0.008));
  const shares = Math.round(views * (0.006 + rng() * 0.004));
  const saves = Math.round(views * (0.015 + rng() * 0.01));
  const watchTimeSeconds = Math.round(views * (6 + rng() * 4));
  const profileVisits = Math.round(views * (0.02 + rng() * 0.015));
  const followersGained = Math.round(profileVisits * (0.08 + rng() * 0.05));
  const linkClicks = Math.round(views * (0.004 + rng() * 0.004));
  const engagementRate =
    reach > 0 ? Number((((likes + comments + shares + saves) / reach) * 100).toFixed(2)) : 0;

  return {
    views,
    reach,
    impressions,
    likes,
    comments,
    shares,
    saves,
    watchTimeSeconds,
    engagementRate,
    profileVisits,
    followersGained,
    linkClicks,
  };
}

export async function seedContent(
  prisma: PrismaClient,
  socialAccountId: string,
  rng: () => number,
) {
  await prisma.contentMetric.deleteMany({ where: { post: { socialAccountId } } });
  await prisma.comment.deleteMany({ where: { post: { socialAccountId } } });
  await prisma.post.deleteMany({ where: { socialAccountId } });

  const posts: { id: string; index: number; isFlagship: boolean }[] = [];
  const today = dateForIndex(NUM_DAYS - 1);

  for (let i = 0; i < CAPTIONS.length; i++) {
    const publishDayIndex = 4 + i * 4.6; // spread across the 90-day window
    const publishedAt = dateForIndex(Math.min(NUM_DAYS - 2, Math.round(publishDayIndex)));
    const isImage = i === 5 || i === 11;
    const tier = tierForIndex(i);

    const post = await prisma.post.create({
      data: {
        socialAccountId,
        externalId: `demo_media_${i}`,
        type: isImage ? "IMAGE" : "REEL",
        caption: CAPTIONS[i],
        mediaUrl: `https://picsum.photos/seed/autodm-post-${i}/720/1280`,
        thumbnailUrl: `https://picsum.photos/seed/autodm-post-${i}/400/711`,
        permalink: `https://instagram.com/reel/demo_${i}`,
        publishedAt,
      },
    });
    posts.push({ id: post.id, index: i, isFlagship: !!tier.isFlagship });

    const daysAvailable = Math.min(14, differenceInCalendarDays(today, publishedAt));
    const metricRows = [];
    for (let d = 0; d <= daysAvailable; d++) {
      const metrics = decayMetricsForDay(d, tier.baseViews, rng);
      metricRows.push({
        postId: post.id,
        metricDate: addDays(publishedAt, d),
        ...metrics,
      });
    }
    if (metricRows.length > 0) {
      await prisma.contentMetric.createMany({ data: metricRows });
    }
  }

  return posts;
}
