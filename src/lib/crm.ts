import { prisma } from "@/lib/prisma";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/crm-constants";

export { PIPELINE_STAGES, STAGE_LABELS, type PipelineStage } from "@/lib/crm-constants";

// Board columns only ever render this many cards before showing "+N more" —
// fetching the rest (a workspace can have thousands of leads) and joining
// contact/tags/account onto every one just to throw away all but 20 per
// column was the single most expensive query in the app. One cheap groupBy
// for the badge counts + one capped, indexed findMany per stage (all run in
// parallel) replaces a single unbounded full-table-with-joins scan.
export const PIPELINE_COLUMN_LIMIT = 20;

const leadCardInclude = {
  contact: {
    include: {
      tags: { include: { tag: true } },
      socialAccount: { select: { platform: true } },
    },
  },
  automation: { select: { name: true } },
} as const;

export async function getPipelineLeads(workspaceId: string) {
  const [counts, ...stageLeads] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      where: { workspaceId, status: { in: [...PIPELINE_STAGES] } },
      _count: { _all: true },
    }),
    ...PIPELINE_STAGES.map((stage) =>
      prisma.lead.findMany({
        where: { workspaceId, status: stage },
        include: leadCardInclude,
        orderBy: { capturedAt: "desc" },
        take: PIPELINE_COLUMN_LIMIT,
      }),
    ),
  ]);

  const totalByStage = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<
    PipelineStage,
    number
  >;

  const byStage = {} as Record<PipelineStage, { leads: (typeof stageLeads)[number]; total: number }>;
  PIPELINE_STAGES.forEach((stage, i) => {
    byStage[stage] = { leads: stageLeads[i], total: totalByStage[stage] ?? 0 };
  });
  return byStage;
}

export async function getLeadDetail(leadId: string, workspaceId: string) {
  return prisma.lead.findFirst({
    where: { id: leadId, workspaceId },
    include: {
      contact: {
        include: {
          tags: { include: { tag: true } },
          socialAccount: { select: { platform: true, username: true } },
        },
      },
      automation: { select: { id: true, name: true } },
      conversions: true,
    },
  });
}
