"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getFacebookConnector } from "@/lib/connectors/facebook";
import { syncRealInstagramAnalytics } from "@/lib/analytics/real-sync";

export async function syncRealAccountDataAction(
  socialAccountId: string,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const { workspaceId } = await getCurrentWorkspaceContext();

    const account = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId, workspaceId },
      include: { connection: true },
    });

    if (!account) {
      return { ok: false, error: "Social account not found." };
    }

    if (account.connection?.mode !== "LIVE") {
      return {
        ok: false,
        error: "This account is in Demo Mode. Connect via Meta OAuth first to enable live sync.",
      };
    }

    if (account.platform === "INSTAGRAM") {
      const result = await syncRealInstagramAnalytics(account.id);
      if (!result.ok) {
        return { ok: false, error: result.error ?? "Sync failed" };
      }
    } else if (account.platform === "MESSENGER") {
      const connector = await getFacebookConnector(account.id);
      await connector.getPageProfile(account.id);
      await connector.getPosts(account.id);

      await prisma.platformConnection.update({
        where: { socialAccountId: account.id },
        data: { lastSyncedAt: new Date(), lastSyncStatus: "SUCCESS" },
      });
    }

    revalidatePath("/settings/integrations");
    revalidatePath("/analytics/profile");
    revalidatePath("/analytics/content");
    revalidatePath("/dashboard");

    return { ok: true, message: "Live account data synced successfully from Meta." };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sync failed",
    };
  }
}
