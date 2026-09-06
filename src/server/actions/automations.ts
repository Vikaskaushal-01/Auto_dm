"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { automationFormSchema } from "@/lib/validation/automation";

export interface AutomationActionResult {
  ok: boolean;
  error?: string;
  automationId?: string;
}

async function upsertAutomationLink(
  workspaceId: string,
  automationId: string,
  automationName: string,
  label: string,
  destinationUrl: string,
): Promise<string> {
  const existing = await prisma.link.findFirst({ where: { automationId } });
  if (existing) {
    const updated = await prisma.link.update({
      where: { id: existing.id },
      data: { label, destinationUrl },
    });
    return updated.id;
  }

  const baseSlug = slugify(label || automationName) || "link";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.link.findUnique({ where: { shortSlug: slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const created = await prisma.link.create({
    data: {
      workspaceId,
      automationId,
      label: label || automationName,
      destinationUrl,
      shortSlug: slug,
      utmSource: "instagram",
      utmMedium: "autodm",
      utmCampaign: slugify(automationName),
    },
  });
  return created.id;
}

export async function saveAutomationAction(
  input: unknown,
  automationId?: string,
): Promise<AutomationActionResult> {
  const parsed = automationFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const { workspaceId, socialAccount } = await getCurrentWorkspaceContext();

  const automation = await prisma.automation.upsert({
    where: { id: automationId ?? "__new__" },
    update: { name: data.name, status: data.status, scope: data.scope },
    create: {
      workspaceId,
      socialAccountId: socialAccount.id,
      name: data.name,
      status: data.status,
      scope: data.scope,
    },
  });

  await prisma.$transaction([
    prisma.automationTrigger.deleteMany({ where: { automationId: automation.id } }),
    prisma.automationTrigger.create({
      data: {
        automationId: automation.id,
        keywordGroup: data.keywords,
        matchType: data.matchType,
        caseSensitive: data.caseSensitive,
      },
    }),
    prisma.automationTargetPost.deleteMany({ where: { automationId: automation.id } }),
  ]);

  if (data.scope === "SPECIFIC_POSTS" && data.targetPostIds.length > 0) {
    await prisma.automationTargetPost.createMany({
      data: data.targetPostIds.map((postId) => ({ automationId: automation.id, postId })),
    });
  }

  let linkId: string | undefined;
  if (data.linkDestinationUrl) {
    linkId = await upsertAutomationLink(
      workspaceId,
      automation.id,
      data.name,
      data.linkLabel || data.name,
      data.linkDestinationUrl,
    );
  }

  await prisma.automationAction.deleteMany({ where: { automationId: automation.id } });
  await prisma.automationAction.createMany({
    data: [
      {
        automationId: automation.id,
        order: 0,
        type: "PUBLIC_REPLY",
        publicReplyVariations: data.publicReplyVariations,
        tagIdsToApply: [],
      },
      {
        automationId: automation.id,
        order: 1,
        type: "SEND_DM",
        publicReplyVariations: [],
        dmContentType: data.dmContentType,
        dmBody: data.dmBody,
        dmMediaUrl: data.dmMediaUrl || null,
        linkId,
        requiresEmailCapture: data.requiresEmailCapture,
        requiresFollow: data.requiresFollow,
        tagIdsToApply: data.tagIds,
      },
    ],
  });

  revalidatePath("/automations");
  revalidatePath(`/automations/${automation.id}/edit`);
  return { ok: true, automationId: automation.id };
}

export async function deleteAutomationAction(automationId: string): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  await prisma.automation.deleteMany({ where: { id: automationId, workspaceId } });
  revalidatePath("/automations");
  redirect("/automations");
}

export async function toggleAutomationStatusAction(
  automationId: string,
  status: "ACTIVE" | "PAUSED" | "DRAFT",
): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  await prisma.automation.updateMany({
    where: { id: automationId, workspaceId },
    data: { status },
  });
  revalidatePath("/automations");
}
