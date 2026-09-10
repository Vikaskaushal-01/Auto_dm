import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Starting dummy data cleanup...");

  // 1. Identify demo accounts
  const demoAccounts = await prisma.socialAccount.findMany({
    where: {
      OR: [
        { isDemo: true },
        { status: "DEMO" },
        { username: "ai.with.aarav" },
        { username: "+91 98765 43210" },
        { username: "aicreatorstudio" },
      ],
    },
    select: { id: true, username: true, platform: true },
  });

  const demoAccountIds = demoAccounts.map((a) => a.id);
  console.log(`Found ${demoAccountIds.length} demo accounts:`, demoAccounts.map((a) => `@${a.username} (${a.platform})`));

  if (demoAccountIds.length > 0) {
    // 2. Cascade delete records associated with demo accounts
    const delRuns = await prisma.automationRun.deleteMany({
      where: {
        OR: [
          { automation: { socialAccountId: { in: demoAccountIds } } },
          { comment: { post: { socialAccountId: { in: demoAccountIds } } } },
        ],
      },
    });
    console.log(`  Deleted ${delRuns.count} automation runs`);

    const delConversions = await prisma.conversion.deleteMany({
      where: {
        lead: { contact: { socialAccountId: { in: demoAccountIds } } },
      },
    });
    console.log(`  Deleted ${delConversions.count} conversions`);

    const delLeads = await prisma.lead.deleteMany({
      where: {
        contact: { socialAccountId: { in: demoAccountIds } },
      },
    });
    console.log(`  Deleted ${delLeads.count} leads`);

    const delMessages = await prisma.message.deleteMany({
      where: {
        conversation: { socialAccountId: { in: demoAccountIds } },
      },
    });
    console.log(`  Deleted ${delMessages.count} messages`);

    const delConvs = await prisma.conversation.deleteMany({
      where: {
        socialAccountId: { in: demoAccountIds },
      },
    });
    console.log(`  Deleted ${delConvs.count} conversations`);

    const delContactTags = await prisma.contactTag.deleteMany({
      where: {
        contact: { socialAccountId: { in: demoAccountIds } },
      },
    });
    console.log(`  Deleted ${delContactTags.count} contact tags`);

    const delLinkClicks = await prisma.linkClick.deleteMany({
      where: {
        contact: { socialAccountId: { in: demoAccountIds } },
      },
    });
    console.log(`  Deleted ${delLinkClicks.count} link clicks`);

    const delContacts = await prisma.contact.deleteMany({
      where: {
        socialAccountId: { in: demoAccountIds },
      },
    });
    console.log(`  Deleted ${delContacts.count} contacts`);

    const delMetrics = await prisma.metricSnapshot.deleteMany({
      where: {
        accountId: { in: demoAccountIds },
      },
    });
    console.log(`  Deleted ${delMetrics.count} metric snapshots`);

    const delComments = await prisma.comment.deleteMany({
      where: {
        post: { socialAccountId: { in: demoAccountIds } },
      },
    });
    console.log(`  Deleted ${delComments.count} comments`);

    const delContentMetrics = await prisma.contentMetric.deleteMany({
      where: {
        post: { socialAccountId: { in: demoAccountIds } },
      },
    });
    console.log(`  Deleted ${delContentMetrics.count} content metrics`);

    const delAutoTargetPosts = await prisma.automationTargetPost.deleteMany({
      where: {
        post: { socialAccountId: { in: demoAccountIds } },
      },
    });
    console.log(`  Deleted ${delAutoTargetPosts.count} automation target posts`);

    const delAutomations = await prisma.automation.deleteMany({
      where: {
        socialAccountId: { in: demoAccountIds },
      },
    });
    console.log(`  Deleted ${delAutomations.count} automations`);

    const delPosts = await prisma.post.deleteMany({
      where: {
        socialAccountId: { in: demoAccountIds },
      },
    });
    console.log(`  Deleted ${delPosts.count} posts`);

    const delFollowers = await prisma.followerSnapshot.deleteMany({
      where: {
        socialAccountId: { in: demoAccountIds },
      },
    });
    console.log(`  Deleted ${delFollowers.count} follower snapshots`);

    const delProfiles = await prisma.profile.deleteMany({
      where: {
        socialAccountId: { in: demoAccountIds },
      },
    });
    console.log(`  Deleted ${delProfiles.count} profiles`);

    const delConnections = await prisma.platformConnection.deleteMany({
      where: {
        socialAccountId: { in: demoAccountIds },
      },
    });
    console.log(`  Deleted ${delConnections.count} platform connections`);

    const delAccounts = await prisma.socialAccount.deleteMany({
      where: {
        id: { in: demoAccountIds },
      },
    });
    console.log(`  Deleted ${delAccounts.count} social accounts`);
  }

  // 3. Remove demo user and demo workspace
  const demoUser = await prisma.user.findUnique({
    where: { email: "demo@autodm.app" },
    include: { memberships: true },
  });

  if (demoUser) {
    for (const membership of demoUser.memberships) {
      await prisma.workspace.delete({ where: { id: membership.workspaceId } });
      console.log(`  Deleted demo workspace: ${membership.workspaceId}`);
    }
    await prisma.user.delete({ where: { id: demoUser.id } });
    console.log(`  Deleted demo user: demo@autodm.app`);
  }

  console.log("Cleanup complete! The database is now free of dummy data.");
}

main()
  .catch((e) => {
    console.error("Cleanup error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
