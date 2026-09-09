import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getConnectedAccounts } from "@/lib/platform-accounts";
import { DashboardChrome } from "@/components/layout/dashboard-chrome";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || !session.workspaceId) {
    redirect("/login");
  }

  const [workspace, accounts] = await Promise.all([
    db.workspace.findUnique({ where: { id: session.workspaceId }, select: { name: true } }),
    getConnectedAccounts(session.workspaceId),
  ]);

  const instagram = accounts.find((a) => a.platform === "INSTAGRAM");
  const isLive = instagram?.connection?.mode === "LIVE";

  return (
    <DashboardChrome
      workspaceName={workspace?.name ?? "Workspace"}
      userName={session.user.name ?? session.user.email ?? "User"}
      userEmail={session.user.email ?? ""}
      isLive={isLive}
      instagramUsername={instagram?.username}
      accounts={accounts.map((a) => ({
        platform: a.platform as "INSTAGRAM" | "MESSENGER" | "WHATSAPP",
        username: a.username,
      }))}
    >
      {children}
    </DashboardChrome>
  );
}
