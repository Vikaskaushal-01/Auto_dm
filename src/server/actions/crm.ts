"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import type { PipelineStage } from "@/lib/crm";

export async function updateLeadStatusAction(leadId: string, status: PipelineStage): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  await db.lead.updateMany({ where: { id: leadId, workspaceId }, data: { status } });
  revalidatePath("/crm");
}
