"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { PURCHASABLE_PLANS, type PurchasablePlan } from "@/lib/plans";

// No real billing provider is wired up — this updates Workspace.plan and the
// Subscription row directly, exactly as documented on the Subscription model
// in prisma/schema.prisma. Real Stripe/Razorpay integration would create a
// checkout session here instead and flip these fields via webhook.
export async function changePlanAction(plan: PurchasablePlan): Promise<{ ok: boolean }> {
  if (!PURCHASABLE_PLANS.includes(plan)) return { ok: false };
  const { workspaceId } = await getCurrentWorkspaceContext();

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.$transaction([
    prisma.workspace.update({ where: { id: workspaceId }, data: { plan } }),
    prisma.subscription.upsert({
      where: { workspaceId },
      create: { workspaceId, plan, status: "ACTIVE", currentPeriodEnd: periodEnd },
      update: { plan, status: "ACTIVE", currentPeriodEnd: periodEnd },
    }),
  ]);

  revalidatePath("/billing");
  revalidatePath("/settings/workspace");
  return { ok: true };
}
