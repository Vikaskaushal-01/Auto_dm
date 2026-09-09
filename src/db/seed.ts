import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createUserWorkspaceWithDemoAccount } from "./seed/workspace";
import { seedFollowerHistory } from "./seed/follower-history";
import { seedContent } from "./seed/content";
import { seedAutomations } from "./seed/automations";
import { seedFunnel } from "./seed/funnel";
import { seedWhatsApp } from "./seed/whatsapp";
import { seedFacebook } from "./seed/facebook";
import { seedConversationsForAccount } from "./seed/conversations";
import { mulberry32, RANDOM_SEED } from "./seed/constants";
import {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  DEMO_WORKSPACE_NAME,
  DEMO_WORKSPACE_SLUG,
  DEMO_IG_USERNAME,
  DEMO_IG_DISPLAY_NAME,
} from "./seed/constants";

async function main() {
  const rng = mulberry32(RANDOM_SEED);

  console.log("Seeding demo workspace...");
  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
  const { user, workspace, socialAccount } = await createUserWorkspaceWithDemoAccount(db, {
    email: DEMO_USER_EMAIL,
    passwordHash,
    name: "Aarav Sharma",
    workspaceName: DEMO_WORKSPACE_NAME,
    workspaceSlug: DEMO_WORKSPACE_SLUG,
    igUsername: DEMO_IG_USERNAME,
    igDisplayName: DEMO_IG_DISPLAY_NAME,
    igAvatarSeed: "aarav-creator",
  });
  console.log(`  user:           ${user.email}`);
  console.log(`  workspace:      ${workspace.name} (${workspace.slug})`);
  console.log(`  social account: @${socialAccount.username} (demo mode)`);

  console.log("Seeding 90 days of follower/engagement history...");
  await seedFollowerHistory(db, workspace.id, socialAccount.id, rng);

  console.log("Seeding content (reels + images) with per-day metrics...");
  const posts = await seedContent(db, socialAccount.id, rng);
  const postIdByIndex = new Map(posts.map((p) => [p.index, p.id]));
  console.log(`  ${posts.length} posts created`);

  console.log("Seeding automations (keyword triggers + DM actions)...");
  const automationsByKey = await seedAutomations(db, workspace.id, socialAccount.id, postIdByIndex);
  console.log(`  ${Object.keys(automationsByKey).length} automations created`);

  console.log("Seeding AutoDM funnel (comments -> DMs -> links -> leads -> conversions)...");
  await seedFunnel(db, workspace.id, socialAccount.id, postIdByIndex, automationsByKey, rng);

  const runCount = await db.automationRun.count({ where: { automation: { workspaceId: workspace.id } } });
  const leadCount = await db.lead.count({ where: { workspaceId: workspace.id } });
  const conversionCount = await db.conversion.count({ where: { workspaceId: workspace.id } });
  console.log(`  ${runCount} automation runs, ${leadCount} leads, ${conversionCount} conversions`);

  console.log("Seeding Instagram inbox conversations from existing leads...");
  const igContacts = await db.contact.findMany({
    where: { workspaceId: workspace.id, socialAccountId: socialAccount.id },
    take: 15,
    select: { id: true },
  });
  await seedConversationsForAccount(
    db,
    workspace.id,
    socialAccount.id,
    "INSTAGRAM",
    igContacts.map((c) => c.id),
    rng,
  );

  console.log("Seeding WhatsApp demo account (inbox + messaging tier)...");
  const waAccount = await seedWhatsApp(db, workspace.id, rng);
  console.log(`  ${waAccount.username} (demo mode)`);

  console.log("Seeding Facebook demo account (posts + Page Welcome Bot)...");
  const fbResult = await seedFacebook(db, workspace.id, rng);
  console.log(`  ${fbResult.socialAccount.username} (demo mode)`);

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
