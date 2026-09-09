"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
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
  const existing = await db.link.findFirst({ where: { automationId } });
  if (existing) {
    const updated = await db.link.update({
      where: { id: existing.id },
      data: { label, destinationUrl },
    });
    return updated.id;
  }

  const baseSlug = slugify(label || automationName) || "link";
  let slug = baseSlug;
  let suffix = 1;
  while (await db.link.findUnique({ where: { shortSlug: slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const created = await db.link.create({
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

  const automation = automationId
    ? await db.automation.update({
        where: { id: automationId },
        data: { name: data.name, status: data.status, scope: data.scope },
      })
    : await db.automation.create({
        data: {
          workspaceId,
          socialAccountId: socialAccount.id,
          name: data.name,
          status: data.status,
          scope: data.scope,
        },
      });

  await db.automationTrigger.deleteMany({ where: { automationId: automation.id } });
  await db.automationTrigger.create({
    data: {
      automationId: automation.id,
      keywordGroup: data.keywords,
      matchType: data.matchType,
      caseSensitive: data.caseSensitive,
    },
  });
  await db.automationTargetPost.deleteMany({ where: { automationId: automation.id } });

  if (data.scope === "SPECIFIC_POSTS" && data.targetPostIds.length > 0) {
    await db.automationTargetPost.createMany({
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

  await db.automationAction.deleteMany({ where: { automationId: automation.id } });
  await db.automationAction.createMany({
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
  await db.automation.deleteMany({ where: { id: automationId, workspaceId } });
  revalidatePath("/automations");
  redirect("/automations");
}

export async function toggleAutomationStatusAction(
  automationId: string,
  status: "ACTIVE" | "PAUSED" | "DRAFT",
): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  await db.automation.updateMany({
    where: { id: automationId, workspaceId },
    data: { status },
  });
  revalidatePath("/automations");
}

export interface TestAutomationInput {
  automationId: string;
  commentText: string;
  commenterUsername: string;
  postId?: string;
  externalCommentId?: string;
}

export interface TestAutomationResult {
  ok: boolean;
  error?: string;
  matched?: boolean;
  dmSent?: boolean;
  dmText?: string;
  publicReplySent?: boolean;
  publicReplyText?: string;
  automationRunId?: string;
}

export async function testAutomationAction(
  input: TestAutomationInput,
): Promise<TestAutomationResult> {
  const { workspaceId, socialAccount } = await getCurrentWorkspaceContext();

  const automation = await db.automation.findFirst({
    where: { id: input.automationId, workspaceId },
    include: { targetPosts: true, triggers: true, actions: true },
  });

  if (!automation) {
    return { ok: false, error: "Automation not found" };
  }

  // Determine target media ID
  let mediaExternalId = "17898949089598826";
  if (automation.targetPosts.length > 0) {
    const post = await db.post.findUnique({
      where: { id: automation.targetPosts[0].postId },
    });
    if (post?.externalId) {
      mediaExternalId = post.externalId;
    }
  }

  const { processInstagramComment } = await import("@/lib/automations/executor");

  const commentId = input.externalCommentId?.trim() || `sim_${Date.now()}`;
  const isSimulation = commentId.startsWith("sim_");

  const result = await processInstagramComment({
    externalCommentId: commentId,
    text: input.commentText,
    commenterUsername: input.commenterUsername.replace(/^@/, "").trim() || socialAccount.username,
    mediaExternalId,
    socialAccountId: socialAccount.id,
    isSimulation,
  });

  revalidatePath(`/automations/${automation.id}/edit`);
  revalidatePath(`/automations`);

  return {
    ok: true,
    matched: result.matched,
    dmSent: result.dmSent,
    dmText: result.dmText,
    publicReplySent: result.publicReplySent,
    publicReplyText: result.publicReplyText,
    automationRunId: result.automationRunId,
    error: result.error,
  };
}

