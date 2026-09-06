import Link from "next/link";
import { Workflow } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getFlows } from "@/lib/flows";
import { NewFlowControls } from "@/components/flow-builder/new-flow-controls";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400",
  PAUSED: "bg-amber-500/15 text-amber-400",
  DRAFT: "bg-neutral-700/50 text-neutral-400",
};

export default async function FlowBuilderPage() {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const flows = await getFlows(workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Flow Builder</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Design multi-step DM automations visually, or generate a starting draft from a prompt.
          </p>
        </div>
        <NewFlowControls />
      </div>

      {flows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center">
          <Workflow className="mx-auto h-8 w-8 text-neutral-600" aria-hidden />
          <p className="mt-3 text-sm text-neutral-400">No flows yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <Link
              key={flow.id}
              href={`/flow-builder/${flow.id}`}
              className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-colors hover:border-neutral-700"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="truncate font-medium text-white">{flow.name}</h2>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[flow.status]}`}>
                  {flow.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {flow._count.nodes} block{flow._count.nodes === 1 ? "" : "s"}
                {flow.automation ? ` · linked to ${flow.automation.name}` : ""}
              </p>
              <p className="mt-2 text-xs text-neutral-600">Updated {flow.updatedAt.toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
