"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { generateFlowFromPrompt } from "@/lib/flow-generator";
import { FLOW_NODE_META, type FlowNodeType } from "@/lib/flow-node-types";
import type { InputJsonValue } from "@/types/models";

export async function createFlowAction(name: string): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const flow = await db.flow.create({
    data: {
      workspaceId,
      name: name.trim() || "Untitled Flow",
      status: "DRAFT",
      nodes: {
        create: [
          {
            type: "TRIGGER",
            positionX: 60,
            positionY: 180,
            data: FLOW_NODE_META.TRIGGER.defaultData as InputJsonValue,
          },
        ],
      },
    },
  });
  revalidatePath("/flow-builder");
  redirect(`/flow-builder/${flow.id}`);
}

export async function generateFlowAction(prompt: string): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const generated = generateFlowFromPrompt(prompt);

  const flow = await db.flow.create({
    data: { workspaceId, name: generated.name, status: "DRAFT" },
  });

  const idMap: Record<string, string> = {};
  for (const node of generated.nodes) {
    const created = await db.flowNode.create({
      data: {
        flowId: flow.id,
        type: node.type,
        positionX: node.x,
        positionY: node.y,
        data: node.data as InputJsonValue,
      },
    });
    idMap[node.tempId] = created.id;
  }
  for (const edge of generated.edges) {
    const sourceNodeId = idMap[edge.source];
    const targetNodeId = idMap[edge.target];
    if (!sourceNodeId || !targetNodeId) continue;
    await db.flowEdge.create({ data: { flowId: flow.id, sourceNodeId, targetNodeId } });
  }

  revalidatePath("/flow-builder");
  redirect(`/flow-builder/${flow.id}`);
}

export interface SaveFlowNodeInput {
  id: string;
  type: FlowNodeType;
  x: number;
  y: number;
  data: Record<string, unknown>;
}

export interface SaveFlowEdgeInput {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface SaveFlowInput {
  flowId: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  nodes: SaveFlowNodeInput[];
  edges: SaveFlowEdgeInput[];
}

export async function saveFlowAction(
  input: SaveFlowInput,
): Promise<{ ok: boolean; idMap: Record<string, string>; error?: string }> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const flow = await db.flow.findFirst({ where: { id: input.flowId, workspaceId } });
  if (!flow) return { ok: false, idMap: {}, error: "Flow not found" };

  await db.flowEdge.deleteMany({ where: { flowId: flow.id } });
  await db.flowNode.deleteMany({ where: { flowId: flow.id } });
  await db.flow.update({ where: { id: flow.id }, data: { name: input.name.trim() || "Untitled Flow", status: input.status } });

  const idMap: Record<string, string> = {};
  for (const node of input.nodes) {
    const created = await db.flowNode.create({
      data: {
        flowId: flow.id,
        type: node.type,
        positionX: node.x,
        positionY: node.y,
        data: node.data as InputJsonValue,
      },
    });
    idMap[node.id] = created.id;
  }
  for (const edge of input.edges) {
    const sourceNodeId = idMap[edge.source];
    const targetNodeId = idMap[edge.target];
    if (!sourceNodeId || !targetNodeId) continue;
    await db.flowEdge.create({
      data: {
        flowId: flow.id,
        sourceNodeId,
        targetNodeId,
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
      },
    });
  }

  revalidatePath(`/flow-builder/${flow.id}`);
  revalidatePath("/flow-builder");
  return { ok: true, idMap };
}

export async function deleteFlowAction(flowId: string): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  await db.flow.deleteMany({ where: { id: flowId, workspaceId } });
  revalidatePath("/flow-builder");
  redirect("/flow-builder");
}
