import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getPipelineLeads, PIPELINE_STAGES, STAGE_LABELS } from "@/lib/crm";
import { LeadCard } from "@/components/crm/lead-card";
import { formatCount } from "@/lib/analytics/format";

export default async function CrmPage() {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const byStage = await getPipelineLeads(workspaceId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Leads / CRM</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Every lead captured through AutoDM, tracked through your pipeline.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {PIPELINE_STAGES.map((stage) => {
          const { leads, total } = byStage[stage];
          return (
            <div key={stage} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-white">{STAGE_LABELS[stage]}</h2>
                <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                  {formatCount(total)}
                </span>
              </div>
              <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/40 p-2">
                {leads.length === 0 ? (
                  <p className="p-3 text-center text-xs text-neutral-600">No leads here yet.</p>
                ) : (
                  leads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={{
                        id: lead.id,
                        status: lead.status as (typeof PIPELINE_STAGES)[number],
                        contactName:
                          [lead.contact.firstName, lead.contact.lastName].filter(Boolean).join(" ") ||
                          lead.contact.platformUsername ||
                          lead.contact.email ||
                          "Unknown",
                        platformUsername: lead.contact.platformUsername,
                        automationName: lead.automation?.name ?? null,
                        tags: lead.contact.tags.map((t) => ({
                          id: t.tag.id,
                          name: t.tag.name,
                          color: t.tag.color,
                        })),
                        capturedAt: lead.capturedAt,
                      }}
                    />
                  ))
                )}
                {total > leads.length && (
                  <p className="p-1 text-center text-[11px] text-neutral-600">
                    +{formatCount(total - leads.length)} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
