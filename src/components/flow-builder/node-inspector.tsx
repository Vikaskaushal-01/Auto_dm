"use client";

import { Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FLOW_NODE_META, type FlowFieldDef } from "@/lib/flow-node-types";
import type { FlowNodeData } from "./flow-node-card";

export function NodeInspector({
  node,
  onChange,
  onDelete,
  onClose,
}: {
  node: { id: string; data: FlowNodeData };
  onChange: (nodeId: string, data: FlowNodeData) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}) {
  const meta = FLOW_NODE_META[node.data.kind];
  const Icon = meta.icon;

  function setField(key: string, value: unknown) {
    onChange(node.id, { ...node.data, [key]: value });
  }

  function renderField(field: FlowFieldDef) {
    const raw = node.data[field.key];

    if (field.kind === "textarea") {
      return (
        <Textarea
          rows={3}
          value={typeof raw === "string" ? raw : ""}
          placeholder={field.placeholder}
          onChange={(e) => setField(field.key, e.target.value)}
        />
      );
    }
    if (field.kind === "number") {
      return (
        <Input
          type="number"
          value={typeof raw === "number" ? raw : 0}
          onChange={(e) => setField(field.key, Number(e.target.value))}
        />
      );
    }
    if (field.kind === "keywords") {
      const list = Array.isArray(raw) ? raw.join(", ") : "";
      return (
        <Input
          value={list}
          placeholder={field.placeholder}
          onChange={(e) =>
            setField(
              field.key,
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      );
    }
    if (field.kind === "select") {
      return (
        <select
          value={typeof raw === "string" ? raw : field.options?.[0]}
          onChange={(e) => setField(field.key, e.target.value)}
          className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        >
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    return (
      <Input
        type={field.kind === "url" ? "url" : "text"}
        value={typeof raw === "string" ? raw : ""}
        placeholder={field.placeholder}
        onChange={(e) => setField(field.key, e.target.value)}
      />
    );
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${meta.color}`} aria-hidden />
          <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white"
          aria-label="Close inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-4 text-xs text-neutral-500">{meta.description}</p>

      {meta.fields.length === 0 ? (
        <p className="text-xs text-neutral-600">This block has no configurable options.</p>
      ) : (
        <div className="space-y-3">
          {meta.fields.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs font-medium text-neutral-400">{field.label}</label>
              {renderField(field)}
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="mt-6"
        onClick={() => onDelete(node.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete block
      </Button>
    </aside>
  );
}
