import { prisma } from "@/lib/prisma";

export async function getFlows(workspaceId: string) {
  return prisma.flow.findMany({
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
  return prisma.flow.findFirst({
    where: { id: flowId, workspaceId },
    include: {
      nodes: true,
      edges: true,
      automation: { select: { id: true, name: true } },
    },
  });
}
