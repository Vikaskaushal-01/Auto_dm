import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Shared by every (dashboard) page: resolves the logged-in user's workspace
 * and primary Instagram account. The layout already redirects unauthenticated
 * requests to /login, but pages fetch this independently (server components
 * don't share request-scoped context) so each one is safe to hit directly.
 */
export async function getCurrentWorkspaceContext() {
  const session = await auth();
  if (!session?.user || !session.workspaceId) {
    redirect("/login");
  }

  const socialAccount = await db.socialAccount.findFirst({
    where: { workspaceId: session.workspaceId, platform: "INSTAGRAM" },
  });
  if (!socialAccount) {
    redirect("/settings/integrations");
  }

  return {
    userId: session.user.id,
    workspaceId: session.workspaceId,
    socialAccount,
  };
}
