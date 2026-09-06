import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConnectedAccounts } from "@/lib/platform-accounts";
import { DashboardChrome } from "@/components/layout/dashboard-chrome";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || !session.workspaceId) {
    redirect("/login");
  }

  const [workspace, accounts] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: session.workspaceId }, select: { name: true } }),
    getConnectedAccounts(session.workspaceId),
  ]);

  return (
    <DashboardChrome
      workspaceName={workspace?.name ?? "Workspace"}
      userName={session.user.name ?? session.user.email ?? "User"}
      userEmail={session.user.email ?? ""}
      accounts={accounts.map((a) => ({
        platform: a.platform as "INSTAGRAM" | "MESSENGER" | "WHATSAPP",
        username: a.username,
      }))}
    >
      {children}
    </DashboardChrome>
  );
}
