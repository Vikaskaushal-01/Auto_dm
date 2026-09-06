import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { prisma } from "@/lib/prisma";
import { AutomationForm } from "@/components/automations/automation-form";

export default async function NewAutomationPage() {
  const { workspaceId, socialAccount } = await getCurrentWorkspaceContext();

  const [posts, tags] = await Promise.all([
    prisma.post.findMany({
      where: { socialAccountId: socialAccount.id },
      select: { id: true, caption: true, thumbnailUrl: true },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.tag.findMany({ where: { workspaceId }, select: { id: true, name: true, color: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Create Automation</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Turn comments into DMs: pick a trigger, write your public reply, and build the DM.
        </p>
      </div>
      <AutomationForm availablePosts={posts} availableTags={tags} />
    </div>
  );
}
