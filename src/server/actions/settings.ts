"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { seedFollowerHistory } from "../../../prisma/seed/follower-history";
import { seedContent } from "../../../prisma/seed/content";
import { seedAutomations } from "../../../prisma/seed/automations";
import { seedFunnel } from "../../../prisma/seed/funnel";
import { seedWhatsApp } from "../../../prisma/seed/whatsapp";
import { seedFacebook } from "../../../prisma/seed/facebook";
import { mulberry32 } from "../../../prisma/seed/constants";

/**
 * Regenerates this workspace's demo dataset (follower history, content,
 * automations, funnel) with fresh random data. Full regeneration takes
 * ~5 minutes (thousands of per-row Contact/Lead/Conversion creates in
 * seedFunnel), far longer than a request should block on, so this is
 * intentionally fire-and-forget: the promise chain keeps running on the
 * Node process after the response is sent, since this is a self-hosted
 * long-lived server, not a serverless function that gets frozen on return.
 *
 * Note: this REPLACES any automations the user built themselves (seedAutomations
 * deletes all workspace automations before recreating the demo blueprints) —
 * the UI must warn about this before calling.
 */
export async function regenerateDemoDataAction(): Promise<{ ok: boolean }> {
  const { workspaceId, socialAccount } = await getCurrentWorkspaceContext();
  const rng = mulberry32(Date.now() % 2147483647);

  void (async () => {
    try {
      await seedFollowerHistory(prisma, workspaceId, socialAccount.id, rng);
      const posts = await seedContent(prisma, socialAccount.id, rng);
      const postIdByIndex = new Map(posts.map((p) => [p.index, p.id]));
      const automationsByKey = await seedAutomations(prisma, workspaceId, socialAccount.id, postIdByIndex);
      await seedFunnel(prisma, workspaceId, socialAccount.id, postIdByIndex, automationsByKey, rng);
      console.log(`Demo data regenerated for workspace ${workspaceId}`);
    } catch (err) {
      console.error(`Demo data regeneration failed for workspace ${workspaceId}:`, err);
    }
  })();

  return { ok: true };
}

/**
 * "Connects" a WhatsApp or Facebook demo account for the current workspace —
 * runs the same seed generator used at first-seed time, just scoped to one
 * platform, and fast enough (a few seconds) to await directly unlike the
 * full Instagram regeneration above.
 */
export async function connectPlatformAction(
  platform: "FACEBOOK" | "WHATSAPP",
): Promise<{ ok: boolean; error?: string }> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const rng = mulberry32(Date.now() % 2147483647);

  try {
    if (platform === "WHATSAPP") {
      await seedWhatsApp(prisma, workspaceId, rng);
    } else {
      await seedFacebook(prisma, workspaceId, rng);
    }
  } catch (err) {
    console.error(`Failed to connect ${platform} demo account:`, err);
    return { ok: false, error: "Something went wrong connecting this account." };
  }

  revalidatePath("/settings/integrations");
  revalidatePath("/automations");
  return { ok: true };
}

export async function updateWorkspaceNameAction(name: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Workspace name must be at least 2 characters." };
  }
  const { workspaceId } = await getCurrentWorkspaceContext();
  await prisma.workspace.update({ where: { id: workspaceId }, data: { name: trimmed } });
  revalidatePath("/settings/workspace");
  return { ok: true };
}

export async function inviteTeamMemberAction(email: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const { workspaceId } = await getCurrentWorkspaceContext();

  const existingUser = await prisma.user.findUnique({ where: { email: trimmed } });
  if (existingUser) {
    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
    });
    if (alreadyMember) {
      return { ok: false, error: "This person is already on the team." };
    }
    await prisma.workspaceMember.create({
      data: { workspaceId, userId: existingUser.id, role: "MEMBER", status: "ACTIVE" },
    });
  } else {
    // Real email delivery isn't wired up in Phase 1 — the invite is recorded
    // (invitedEmail, userId null since they have no account yet) so it shows
    // in the team list, but no email is sent.
    await prisma.workspaceMember.create({
      data: { workspaceId, role: "MEMBER", status: "INVITED", invitedEmail: trimmed },
    });
  }

  revalidatePath("/settings/team");
  return { ok: true };
}

export async function removeTeamMemberAction(memberId: string): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  await prisma.workspaceMember.deleteMany({ where: { id: memberId, workspaceId } });
  revalidatePath("/settings/team");
}
