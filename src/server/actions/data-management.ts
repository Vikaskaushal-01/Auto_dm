"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { encryptToken } from "@/lib/security/encryption";

export interface ConnectWhatsAppInput {
  phoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  systemUserToken: string;
}

/**
 * Connects a real WhatsApp Business Account with System User Token.
 */
export async function connectWhatsAppCredentialsAction(
  input: ConnectWhatsAppInput,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { workspaceId } = await getCurrentWorkspaceContext();

    if (!input.phoneNumberId || !input.systemUserToken) {
      return { ok: false, error: "Phone Number ID and Access Token are required." };
    }

    const encryptedToken = encryptToken(input.systemUserToken);

    const existing = await prisma.socialAccount.findFirst({
      where: { workspaceId, platform: "WHATSAPP" },
    });

    const socialAccount = existing
      ? await prisma.socialAccount.update({
          where: { id: existing.id },
          data: {
            externalAccountId: input.phoneNumberId,
            username: input.phoneNumber || "WhatsApp Business",
            displayName: "WhatsApp Business Account",
            status: "CONNECTED",
            isDemo: false,
          },
        })
      : await prisma.socialAccount.create({
          data: {
            workspaceId,
            platform: "WHATSAPP",
            externalAccountId: input.phoneNumberId,
            username: input.phoneNumber || "WhatsApp Business",
            displayName: "WhatsApp Business Account",
            status: "CONNECTED",
            isDemo: false,
          },
        });

    await prisma.platformConnection.upsert({
      where: { socialAccountId: socialAccount.id },
      update: {
        mode: "LIVE",
        accessToken: encryptedToken,
        messagingTier: "TIER_1",
        qualityRating: "GREEN",
        dailyMessageLimit: 250,
        lastSyncedAt: new Date(),
        lastSyncStatus: "SUCCESS",
      },
      create: {
        socialAccountId: socialAccount.id,
        mode: "LIVE",
        accessToken: encryptedToken,
        messagingTier: "TIER_1",
        qualityRating: "GREEN",
        dailyMessageLimit: 250,
        lastSyncedAt: new Date(),
        lastSyncStatus: "SUCCESS",
      },
    });

    revalidatePath("/settings/integrations");
    revalidatePath("/inbox");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to connect WhatsApp" };
  }
}

/**
 * Wipes seeded demo data (demo accounts, demo posts, fake leads/funnel runs)
 * while keeping user accounts and custom automations intact.
 */
export async function wipeDemoDataAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { workspaceId } = await getCurrentWorkspaceContext();

    // Remove demo accounts and their child data
    const demoAccounts = await prisma.socialAccount.findMany({
      where: { workspaceId, isDemo: true },
      select: { id: true },
    });

    const demoAccountIds = demoAccounts.map((a: { id: string }) => a.id);

    if (demoAccountIds.length > 0) {
      // Delete child data linked to demo accounts
      await prisma.automationRun.deleteMany({
        where: { automation: { socialAccountId: { in: demoAccountIds } } },
      });
      await prisma.conversion.deleteMany({
        where: { workspaceId, lead: { contact: { socialAccountId: { in: demoAccountIds } } } },
      });
      await prisma.lead.deleteMany({
        where: { workspaceId, contact: { socialAccountId: { in: demoAccountIds } } },
      });
      await prisma.message.deleteMany({
        where: { conversation: { socialAccountId: { in: demoAccountIds } } },
      });
      await prisma.conversation.deleteMany({
        where: { socialAccountId: { in: demoAccountIds } },
      });
      await prisma.contactTag.deleteMany({
        where: { contact: { socialAccountId: { in: demoAccountIds } } },
      });
      await prisma.linkClick.deleteMany({
        where: { contact: { socialAccountId: { in: demoAccountIds } } },
      });
      await prisma.contact.deleteMany({
        where: { workspaceId, socialAccountId: { in: demoAccountIds } },
      });
      await prisma.metricSnapshot.deleteMany({
        where: { workspaceId, accountId: { in: demoAccountIds } },
      });
      await prisma.comment.deleteMany({
        where: { post: { socialAccountId: { in: demoAccountIds } } },
      });
      await prisma.contentMetric.deleteMany({
        where: { post: { socialAccountId: { in: demoAccountIds } } },
      });
      await prisma.automationTargetPost.deleteMany({
        where: { post: { socialAccountId: { in: demoAccountIds } } },
      });
      await prisma.post.deleteMany({
        where: { socialAccountId: { in: demoAccountIds } },
      });
      await prisma.followerSnapshot.deleteMany({
        where: { socialAccountId: { in: demoAccountIds } },
      });
      await prisma.profile.deleteMany({
        where: { socialAccountId: { in: demoAccountIds } },
      });
      await prisma.platformConnection.deleteMany({
        where: { socialAccountId: { in: demoAccountIds } },
      });
      await prisma.socialAccount.deleteMany({
        where: { id: { in: demoAccountIds } },
      });
    }

    revalidatePath("/settings/integrations");
    revalidatePath("/dashboard");
    revalidatePath("/crm");
    revalidatePath("/automations");
    revalidatePath("/inbox");

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to wipe demo data" };
  }
}
