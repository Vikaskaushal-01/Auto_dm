import { db } from "@/lib/db";

export async function getFlows(workspaceId: string) {
  return db.flow.findMany({
    where: { workspaceId },
    include: {
      automation: { select: { name: true } },
      _count: { select: { nodes: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function getFlowDetail(flowId: string, workspaceId: string) {
  return db.flow.findFirst({
    where: { id: flowId, workspaceId },
    include: {
      nodes: true,
      edges: true,
      automation: { select: { id: true, name: true } },
    },
  });
}
