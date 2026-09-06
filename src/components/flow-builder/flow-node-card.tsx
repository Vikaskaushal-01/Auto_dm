"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { FLOW_NODE_META, type FlowNodeType } from "@/lib/flow-node-types";

export type FlowNodeData = { kind: FlowNodeType } & Record<string, unknown>;

export function FlowNodeCard({ data, selected }: NodeProps<Node<FlowNodeData, "flowNode">>) {
  const meta = FLOW_NODE_META[data.kind];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "w-56 rounded-lg border bg-neutral-900 shadow-sm",
        selected ? "border-violet-500 ring-1 ring-violet-500" : "border-neutral-700",
      )}
    >
      {data.kind !== "TRIGGER" && (
        <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-neutral-600 !bg-neutral-700" />
      )}
      <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2">
        <Icon className={cn("h-4 w-4 shrink-0", meta.color)} aria-hidden />
        <span className="truncate text-xs font-medium text-neutral-200">{meta.label}</span>
      </div>
      <div className="line-clamp-2 px-3 py-2 text-xs text-neutral-400">{meta.summary(data)}</div>
      {data.kind !== "END" && (
        <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-violet-400 !bg-violet-500" />
      )}
    </div>
  );
}
