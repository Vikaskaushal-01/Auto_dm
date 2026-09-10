import Link from "next/link";
import { Zap } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { prisma } from "@/lib/prisma";
import { AutomationForm } from "@/components/automations/automation-form";
import { Button } from "@/components/ui/button";

export default async function NewAutomationPage() {
  const { workspaceId, socialAccount } = await getCurrentWorkspaceContext();

  if (!socialAccount) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Create Automation</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Turn comments into DMs: pick a trigger, write your public reply, and build the DM.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 p-12 text-center">
          <Zap className="mx-auto h-10 w-10 text-neutral-600" />
          <h3 className="mt-4 text-base font-semibold text-white">No social account connected</h3>
          <p className="mt-1 text-sm text-neutral-400 max-w-sm mx-auto">
            Connect an Instagram Business or Facebook Page account before creating comment-to-DM automations.
          </p>
          <Link href="/settings/integrations" className="mt-5 inline-block">
            <Button className="bg-violet-600 hover:bg-violet-500 text-white">
              Connect Account in Settings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
