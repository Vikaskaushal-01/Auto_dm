import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Zap } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getLeadDetail, STAGE_LABELS, type PipelineStage } from "@/lib/crm";
import { formatCurrencyINR } from "@/lib/analytics/format";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  const { workspaceId } = await getCurrentWorkspaceContext();
  const lead = await getLeadDetail(leadId, workspaceId);
  if (!lead) notFound();

  const displayName =
    [lead.contact.firstName, lead.contact.lastName].filter(Boolean).join(" ") ||
    lead.contact.platformUsername ||
    "Unknown";
  const totalRevenue = lead.conversions.reduce((acc, c) => acc + c.amountCents, 0);

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/crm" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to CRM
      </Link>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">{displayName}</h1>
            <p className="mt-1 text-sm text-neutral-400">
              {lead.contact.socialAccount?.platform ? `${lead.contact.socialAccount.platform} · ` : ""}
              @{lead.contact.platformUsername ?? "—"}
            </p>
          </div>
          <span className="rounded-full bg-violet-600/15 px-3 py-1 text-xs font-medium text-violet-300">
            {STAGE_LABELS[lead.status as PipelineStage] ?? lead.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-neutral-800 pt-4 sm:grid-cols-2">
          {lead.contact.email && (
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <Mail className="h-4 w-4 text-neutral-500" aria-hidden />
              {lead.contact.email}
            </div>
          )}
          {lead.contact.phone && (
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <Phone className="h-4 w-4 text-neutral-500" aria-hidden />
              {lead.contact.phone}
            </div>
          )}
          {lead.automation && (
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <Zap className="h-4 w-4 text-neutral-500" aria-hidden />
              via {lead.automation.name}
            </div>
          )}
        </div>

        {lead.contact.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-neutral-800 pt-4">
            {lead.contact.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: `${tag.color}26`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Revenue</h2>
        {lead.conversions.length === 0 ? (
          <p className="text-sm text-neutral-500">No conversions yet.</p>
        ) : (
          <>
            <p className="text-2xl font-semibold text-emerald-400">
              {formatCurrencyINR(totalRevenue / 100)}
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-neutral-400">
              {lead.conversions.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{c.occurredAt.toLocaleDateString()}</span>
                  <span className="text-neutral-300">{formatCurrencyINR(c.amountCents / 100)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
