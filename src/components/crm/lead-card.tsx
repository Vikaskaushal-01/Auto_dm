"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PIPELINE_STAGES, STAGE_LABELS, type PipelineStage } from "@/lib/crm-constants";
import { updateLeadStatusAction } from "@/server/actions/crm";

export interface LeadCardData {
  id: string;
  status: PipelineStage;
  contactName: string;
  platformUsername: string | null;
  automationName: string | null;
  tags: { id: string; name: string; color: string }[];
  capturedAt: Date;
}

export function LeadCard({ lead }: { lead: LeadCardData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentIndex = PIPELINE_STAGES.indexOf(lead.status);
  const prevStage = currentIndex > 0 ? PIPELINE_STAGES[currentIndex - 1] : null;
  const nextStage = currentIndex < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[currentIndex + 1] : null;

  function move(stage: PipelineStage) {
    startTransition(async () => {
      await updateLeadStatusAction(lead.id, stage);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
      <Link href={`/crm/${lead.id}`} className="block">
        <p className="truncate text-sm font-medium text-neutral-200">{lead.contactName}</p>
        {lead.platformUsername && (
          <p className="truncate text-xs text-neutral-500">@{lead.platformUsername}</p>
        )}
        {lead.automationName && (
          <p className="mt-1 truncate text-xs text-violet-400">via {lead.automationName}</p>
        )}
        {lead.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {lead.tags.map((t) => (
              <span
                key={t.id}
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${t.color}26`, color: t.color }}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </Link>
      <div className="mt-2 flex items-center justify-between border-t border-neutral-800 pt-2">
        <button
          type="button"
          disabled={!prevStage || isPending}
          onClick={() => prevStage && move(prevStage)}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white disabled:opacity-20"
          aria-label={prevStage ? `Move to ${STAGE_LABELS[prevStage]}` : undefined}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-[10px] text-neutral-600">{lead.capturedAt.toLocaleDateString()}</span>
        <button
          type="button"
          disabled={!nextStage || isPending}
          onClick={() => nextStage && move(nextStage)}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white disabled:opacity-20"
          aria-label={nextStage ? `Move to ${STAGE_LABELS[nextStage]}` : undefined}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
