import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { prisma } from "@/lib/prisma";
import { AutomationForm } from "@/components/automations/automation-form";
import type { AutomationFormInput } from "@/lib/validation/automation";
import { deleteAutomationAction } from "@/server/actions/automations";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";

export default async function EditAutomationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspaceId, socialAccount } = await getCurrentWorkspaceContext();

  const automation = await prisma.automation.findFirst({
    where: { id, workspaceId },
    include: {
      triggers: true,
      actions: { orderBy: { order: "asc" }, include: { link: true } },
      targetPosts: true,
    },
  });
  if (!automation) notFound();

  const [posts, tags] = await Promise.all([
    prisma.post.findMany({
      where: { socialAccountId: socialAccount.id },
      select: { id: true, caption: true, thumbnailUrl: true },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.tag.findMany({ where: { workspaceId }, select: { id: true, name: true, color: true } }),
  ]);

  const trigger = automation.triggers[0];
  const publicReplyAction = automation.actions.find((a) => a.type === "PUBLIC_REPLY");
  const dmAction = automation.actions.find((a) => a.type === "SEND_DM");

  const initial: Partial<AutomationFormInput> = {
    name: automation.name,
    status: automation.status,
    scope: automation.scope,
    targetPostIds: automation.targetPosts.map((t) => t.postId),
    keywords: trigger?.keywordGroup ?? [],
    matchType: trigger?.matchType ?? "CONTAINS",
    caseSensitive: trigger?.caseSensitive ?? false,
    publicReplyVariations: publicReplyAction?.publicReplyVariations ?? [],
    dmContentType: dmAction?.dmContentType ?? "LINK",
    dmBody: dmAction?.dmBody ?? "",
    dmMediaUrl: dmAction?.dmMediaUrl ?? "",
    linkLabel: dmAction?.link?.label ?? "",
    linkDestinationUrl: dmAction?.link?.destinationUrl ?? "",
    requiresEmailCapture: dmAction?.requiresEmailCapture ?? true,
    requiresFollow: dmAction?.requiresFollow ?? true,
    tagIds: dmAction?.tagIdsToApply ?? [],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{automation.name}</h1>
          <p className="mt-1 text-sm text-neutral-400">Edit this automation&apos;s trigger and DM.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/analytics/autodm/automations/${automation.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            <BarChart3 className="h-4 w-4" aria-hidden />
            Performance
          </Link>
          <ConfirmDeleteButton onConfirm={deleteAutomationAction.bind(null, automation.id)} />
        </div>
      </div>
      <AutomationForm
        automationId={automation.id}
        initial={initial}
        availablePosts={posts}
        availableTags={tags}
      />
    </div>
  );
}
