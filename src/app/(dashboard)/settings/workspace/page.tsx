import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { prisma } from "@/lib/prisma";
import { WorkspaceNameForm } from "@/components/settings/workspace-name-form";

export default async function WorkspaceSettingsPage() {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Workspace</h1>
        <p className="mt-1 text-sm text-neutral-400">General settings for this workspace.</p>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <WorkspaceNameForm initialName={workspace.name} />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Slug</dt>
            <dd className="mt-1 text-sm text-neutral-300">{workspace.slug}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Plan</dt>
            <dd className="mt-1">
              <span className="inline-block rounded-full bg-violet-600/15 px-2.5 py-0.5 text-xs font-medium text-violet-300">
                {workspace.plan}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
