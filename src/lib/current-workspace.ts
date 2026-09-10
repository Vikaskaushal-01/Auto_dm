import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma, type SocialAccount } from "@/lib/prisma";

export interface WorkspaceContext {
  userId: string;
  workspaceId: string;
  socialAccount: SocialAccount | null;
}

/**
 * Shared by every (dashboard) page: resolves the logged-in user's workspace
 * and primary connected account (prioritizing INSTAGRAM, then any other platform).
 * Returns socialAccount as null if no account has been linked yet, preventing
 * infinite redirect loops when navigating settings or dashboard without accounts.
 */
export async function getCurrentWorkspaceContext(): Promise<WorkspaceContext> {
  const session = await auth();
  if (!session?.user || !session.workspaceId) {
    redirect("/login");
  }

  let socialAccount = await prisma.socialAccount.findFirst({
    where: { workspaceId: session.workspaceId, platform: "INSTAGRAM" },
    orderBy: { createdAt: "asc" },
  });

  if (!socialAccount) {
    socialAccount = await prisma.socialAccount.findFirst({
      where: { workspaceId: session.workspaceId },
      orderBy: { createdAt: "asc" },
    });
  }

  return {
    userId: session.user.id,
    workspaceId: session.workspaceId,
    socialAccount: socialAccount ?? null,
  };
}
