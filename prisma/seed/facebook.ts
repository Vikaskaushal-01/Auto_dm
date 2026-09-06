import type { PrismaClient } from "../../src/generated/prisma/client";
import { addDays, addHours, subDays } from "date-fns";
import { seedConversationsForAccount } from "./conversations";

const FB_CAPTIONS = [
  "New blog post: 5 ways AI is changing content creation in 2026",
  "Comment \"GUIDE\" and we'll send you our free automation guide!",
  "Behind the scenes: building an AI-powered creator business",
  "Live Q&A recap — thanks for joining, here's the replay",
  "Our biggest launch yet is here 🚀 comment \"INFO\" to learn more",
  "5 lessons from a year of running automations for creators",
];

const USERNAMES = [
  "James Carter", "Maria Lopez", "David Kim", "Sofia Rossi", "Liam O'Brien",
  "Fatima Ali", "Noah Chen", "Emma Wilson", "Lucas Silva", "Olivia Brown",
];

function randomFbUsername(rng: () => number) {
  return USERNAMES[Math.floor(rng() * USERNAMES.length)] + " " + Math.floor(rng() * 999);
}

export async function seedFacebook(prisma: PrismaClient, workspaceId: string, rng: () => number) {
  let socialAccount = await prisma.socialAccount.findFirst({
    where: { workspaceId, platform: "MESSENGER" },
  });

  if (!socialAccount) {
    socialAccount = await prisma.socialAccount.create({
      data: {
        workspaceId,
        platform: "MESSENGER",
        externalAccountId: "demo_fb_page_9988776655",
        username: "aicreatorstudio",
        displayName: "AI Creator Studio",
        avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=aarav-facebook",
        status: "DEMO",
        isDemo: true,
      },
    });
  }

  await prisma.platformConnection.upsert({
    where: { socialAccountId: socialAccount.id },
    update: {},
    create: {
      socialAccountId: socialAccount.id,
      mode: "DEMO",
      scopes: [],
      lastSyncedAt: new Date(),
      lastSyncStatus: "ok",
    },
  });

  await prisma.profile.upsert({
    where: { socialAccountId: socialAccount.id },
    update: {},
    create: {
      socialAccountId: socialAccount.id,
      followersCount: 45_820,
      followingCount: 0,
      mediaCount: FB_CAPTIONS.length,
      bio: "Helping creators automate growth with AI",
      website: "https://autodm.app/aarav",
    },
  });

  // Clean slate for idempotent re-seeding.
  await prisma.contentMetric.deleteMany({ where: { post: { socialAccountId: socialAccount.id } } });
  await prisma.comment.deleteMany({ where: { post: { socialAccountId: socialAccount.id } } });
  await prisma.automationRun.deleteMany({ where: { automation: { socialAccountId: socialAccount.id } } });
  await prisma.automationAction.deleteMany({ where: { automation: { socialAccountId: socialAccount.id } } });
  await prisma.automationTrigger.deleteMany({ where: { automation: { socialAccountId: socialAccount.id } } });
  await prisma.automationTargetPost.deleteMany({ where: { automation: { socialAccountId: socialAccount.id } } });
  await prisma.automation.deleteMany({ where: { socialAccountId: socialAccount.id } });
  await prisma.post.deleteMany({ where: { socialAccountId: socialAccount.id } });

  const today = new Date();
  const postIds: string[] = [];

  for (let i = 0; i < FB_CAPTIONS.length; i++) {
    const publishedAt = subDays(today, (FB_CAPTIONS.length - i) * 6);
    const post = await prisma.post.create({
      data: {
        socialAccountId: socialAccount.id,
        externalId: `demo_fb_post_${i}`,
        type: i % 3 === 0 ? "REEL" : "IMAGE",
        caption: FB_CAPTIONS[i],
        mediaUrl: `https://picsum.photos/seed/autodm-fb-${i}/720/720`,
        thumbnailUrl: `https://picsum.photos/seed/autodm-fb-${i}/400/400`,
        permalink: `https://facebook.com/aicreatorstudio/posts/${i}`,
        publishedAt,
      },
    });
    postIds.push(post.id);

    const daysAvailable = Math.min(10, Math.floor((today.getTime() - publishedAt.getTime()) / 86400000));
    const baseViews = 2000 + Math.floor(rng() * 3000);
    const metricRows = [];
    for (let d = 0; d <= daysAvailable; d++) {
      const decay = Math.exp(-d / 4);
      const views = Math.round(baseViews * decay * (1 + (rng() - 0.5) * 0.3) * (d === 0 ? 3 : 1));
      const reach = Math.round(views * 0.7);
      const likes = Math.round(views * 0.04);
      const comments = Math.round(views * 0.01);
      const shares = Math.round(views * 0.008);
      const saves = 0;
      metricRows.push({
        postId: post.id,
        metricDate: addDays(publishedAt, d),
        views,
        reach,
        impressions: Math.round(views * 1.2),
        likes,
        comments,
        shares,
        saves,
        watchTimeSeconds: Math.round(views * 5),
        engagementRate: reach > 0 ? Number((((likes + comments + shares) / reach) * 100).toFixed(2)) : 0,
        profileVisits: Math.round(views * 0.015),
        followersGained: Math.round(views * 0.005),
        linkClicks: Math.round(views * 0.003),
      });
    }
    if (metricRows.length > 0) await prisma.contentMetric.createMany({ data: metricRows });
  }

  // One automation ("Page Welcome Bot") with its own small comment->Messenger funnel.
  const automation = await prisma.automation.create({
    data: {
      workspaceId,
      socialAccountId: socialAccount.id,
      name: "Page Welcome Bot",
      status: "ACTIVE",
      scope: "SPECIFIC_POSTS",
    },
  });
  await prisma.automationTrigger.create({
    data: { automationId: automation.id, keywordGroup: ["guide", "info"], matchType: "CONTAINS", caseSensitive: false },
  });
  await prisma.automationTargetPost.createMany({
    data: [postIds[1], postIds[4]].map((postId) => ({ automationId: automation.id, postId })),
  });
  await prisma.automationAction.createMany({
    data: [
      {
        automationId: automation.id,
        order: 0,
        type: "PUBLIC_REPLY",
        publicReplyVariations: ["Sent to your Messenger! 📩", "Check your inbox! ✉️"],
        tagIdsToApply: [],
      },
      {
        automationId: automation.id,
        order: 1,
        type: "SEND_DM",
        publicReplyVariations: [],
        dmContentType: "TEXT",
        dmBody: "Hey {{first_name}}! Thanks for your interest — here's more info on what you asked about.",
        requiresEmailCapture: true,
        requiresFollow: false,
        tagIdsToApply: [],
      },
    ],
  });

  const matchedComments = 340 + Math.floor(rng() * 120);
  const targetPosts = [postIds[1], postIds[4]];
  const commentsData = Array.from({ length: matchedComments }, (_, j) => ({
    postId: targetPosts[j % targetPosts.length],
    externalId: `demo_fb_comment_${j}`,
    authorUsername: randomFbUsername(rng),
    text: j % 2 === 0 ? "guide please!" : "info?",
    createdAtPlatform: subDays(today, Math.floor(rng() * 30)),
    matchedAutomationId: automation.id,
  }));
  const comments = await prisma.comment.createManyAndReturn({ data: commentsData });

  const sentCount = Math.round(matchedComments * 0.94);
  const deliveredCount = Math.round(sentCount * 0.97);
  const runsData = comments.map((comment, j) => {
    const reachedSent = j < sentCount;
    const reachedDelivered = j < deliveredCount;
    return {
      automationId: automation.id,
      commentId: comment.id,
      triggeredAt: comment.createdAtPlatform,
      publicReplySentAt: reachedSent ? addHours(comment.createdAtPlatform, 0.02) : null,
      dmSentAt: reachedSent ? addHours(comment.createdAtPlatform, 0.05) : null,
      dmDeliveredAt: reachedDelivered ? addHours(comment.createdAtPlatform, 0.1) : null,
      status: (reachedDelivered ? "DM_DELIVERED" : reachedSent ? "DM_SENT" : "TRIGGERED") as
        | "DM_DELIVERED"
        | "DM_SENT"
        | "TRIGGERED",
    };
  });
  await prisma.automationRun.createMany({ data: runsData });

  // A handful of Messenger contacts + conversations for the Inbox.
  await prisma.contact.deleteMany({ where: { workspaceId, socialAccountId: socialAccount.id } });
  const contacts = await Promise.all(
    Array.from({ length: 10 }, async () => {
      const [firstName, lastName] = randomFbUsername(rng).split(" ");
      return prisma.contact.create({
        data: {
          workspaceId,
          socialAccountId: socialAccount.id,
          platformUsername: `${firstName}.${lastName}`.toLowerCase(),
          firstName,
          lastName,
          source: "MANUAL",
        },
      });
    }),
  );
  await seedConversationsForAccount(
    prisma,
    workspaceId,
    socialAccount.id,
    "MESSENGER",
    contacts.map((c) => c.id),
    rng,
  );

  return { socialAccount, automation };
}
