"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";

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
