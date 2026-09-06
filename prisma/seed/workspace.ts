import type { PrismaClient } from "../../src/generated/prisma/client";

export interface CreateUserWorkspaceInput {
  email: string;
  passwordHash: string;
  name: string;
  workspaceName: string;
  workspaceSlug: string;
  igUsername: string;
  igDisplayName: string;
  igAvatarSeed?: string;
}

/**
 * Creates (or reuses) a user, their workspace, membership, and a DEMO-mode
 * Instagram social account + platform connection + starting profile.
 * Idempotent on email/slug: safe to re-run without duplicating rows.
 *
 * Used both by the CLI demo seed (prisma/seed.ts) and by the real-user
 * registration flow (src/server/actions/auth.ts) — every new signup lands on
 * a populated, demoable workspace immediately.
 */
export async function createUserWorkspaceWithDemoAccount(
  prisma: PrismaClient,
  input: CreateUserWorkspaceInput,
) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {},
    create: {
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: input.workspaceSlug },
    update: {},
    create: {
      name: input.workspaceName,
      slug: input.workspaceSlug,
      plan: "DEMO",
    },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  let socialAccount = await prisma.socialAccount.findFirst({
    where: { workspaceId: workspace.id, platform: "INSTAGRAM" },
  });

  if (!socialAccount) {
    socialAccount = await prisma.socialAccount.create({
      data: {
        workspaceId: workspace.id,
        platform: "INSTAGRAM",
        externalAccountId: `demo_ig_${workspace.id}`,
        username: input.igUsername,
        displayName: input.igDisplayName,
        avatarUrl: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
          input.igAvatarSeed ?? input.igUsername,
        )}`,
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
      followersCount: 8400,
      followingCount: 612,
      mediaCount: 0,
      bio: 'Helping creators automate growth with AI 🤖✨ | DM "AI" for my free roadmap',
      website: "https://autodm.app/" + input.igUsername,
      profileVisits30d: 0,
    },
  });

  return { user, workspace, socialAccount };
}
