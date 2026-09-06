import { notFound } from "next/navigation";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getFlowDetail } from "@/lib/flows";
import { FlowEditor } from "@/components/flow-builder/flow-editor";

export default async function FlowBuilderDetailPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = await params;
  const { workspaceId } = await getCurrentWorkspaceContext();
  const flow = await getFlowDetail(flowId, workspaceId);
  if (!flow) notFound();

  return (
    <FlowEditor
      flowId={flow.id}
      initialName={flow.name}
      initialStatus={flow.status}
      linkedAutomationName={flow.automation?.name ?? null}
      initialNodes={flow.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        x: n.positionX,
        y: n.positionY,
        data: n.data as Record<string, unknown>,
      }))}
      initialEdges={flow.edges.map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      }))}
    />
  );
}
