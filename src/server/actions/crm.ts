"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import type { PipelineStage } from "@/lib/crm";

export async function updateLeadStatusAction(leadId: string, status: PipelineStage): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  await prisma.lead.updateMany({ where: { id: leadId, workspaceId }, data: { status } });
  revalidatePath("/crm");
}
