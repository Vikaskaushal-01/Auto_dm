"use client";

import { useCallback, useMemo, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { FLOW_NODE_META, type FlowNodeType } from "@/lib/flow-node-types";
import { saveFlowAction, deleteFlowAction, type SaveFlowInput } from "@/server/actions/flows";
import { FlowNodeCard, type FlowNodeData } from "./flow-node-card";
import { NodePalette } from "./node-palette";
import { NodeInspector } from "./node-inspector";

const nodeTypes = { flowNode: FlowNodeCard };

export interface FlowEditorNode {
  id: string;
  type: string;
  x: number;
  y: number;
  data: Record<string, unknown>;
}

export interface FlowEditorEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}

type AutomationStatus = "ACTIVE" | "PAUSED" | "DRAFT";

export function FlowEditor(props: {
  flowId: string;
  initialName: string;
  initialStatus: AutomationStatus;
  initialNodes: FlowEditorNode[];
  initialEdges: FlowEditorEdge[];
  linkedAutomationName: string | null;
}) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  );
}

let localIdCounter = 0;
function newLocalId() {
  localIdCounter += 1;
  return `local-${Date.now()}-${localIdCounter}`;
}

function FlowEditorInner({
  flowId,
  initialName,
  initialStatus,
  initialNodes,
  initialEdges,
  linkedAutomationName,
}: {
  flowId: string;
  initialName: string;
  initialStatus: AutomationStatus;
  initialNodes: FlowEditorNode[];
  initialEdges: FlowEditorEdge[];
  linkedAutomationName: string | null;
}) {
  const router = useRouter();
  const { screenToFlowPosition } = useReactFlow();

  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<AutomationStatus>(initialStatus);
  const [isSaving, startSaving] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData, "flowNode">>(
    initialNodes.map((n) => ({
      id: n.id,
      type: "flowNode",
      position: { x: n.x, y: n.y },
      data: { kind: n.type as FlowNodeType, ...n.data },
    })),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initialEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
    })),
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/flow-node-type") as FlowNodeType;
      if (!type || !FLOW_NODE_META[type]) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = newLocalId();
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "flowNode",
          position,
          data: { kind: type, ...FLOW_NODE_META[type].defaultData },
        },
      ]);
    },
    [screenToFlowPosition, setNodes],
  );

  function updateNodeData(nodeId: string, data: FlowNodeData) {
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data } : n)));
  }

  function deleteNode(nodeId: string) {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
  }

  function handleSave() {
    setSaveMessage(null);
    const input: SaveFlowInput = {
      flowId,
      name,
      status,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.kind,
        x: n.position.x,
        y: n.position.y,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      })),
    };
    startSaving(async () => {
      const result = await saveFlowAction(input);
      if (!result.ok) {
        setSaveMessage(result.error ?? "Failed to save flow");
        return;
      }
      setNodes((nds) => nds.map((n) => ({ ...n, id: result.idMap[n.id] ?? n.id })));
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          source: result.idMap[e.source] ?? e.source,
          target: result.idMap[e.target] ?? e.target,
        })),
      );
      setSelectedNodeId(null);
      setSaveMessage("Saved");
      router.refresh();
    });
  }

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] flex-col sm:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-950 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/flow-builder" className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="w-56" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AutomationStatus)}
            className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </select>
          {linkedAutomationName && (
            <span className="hidden truncate text-xs text-neutral-500 md:inline">Linked to {linkedAutomationName}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && <span className="text-xs text-neutral-500">{saveMessage}</span>}
          <ConfirmDeleteButton label="Delete" onConfirm={() => deleteFlowAction(flowId)} />
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save flow"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <NodePalette />
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            colorMode="dark"
            fitView
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable className="!bg-neutral-900" />
          </ReactFlow>
        </div>
        {selectedNode && (
          <NodeInspector
            node={{ id: selectedNode.id, data: selectedNode.data }}
            onChange={updateNodeData}
            onDelete={deleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}
