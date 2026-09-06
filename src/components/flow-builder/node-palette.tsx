"use client";

import { FLOW_NODE_TYPES, type FlowNodeMeta } from "@/lib/flow-node-types";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: FlowNodeMeta["category"][] = ["Flow", "Content", "Logic", "Capture", "Integration"];

export function NodePalette() {
  return (
    <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-neutral-800 bg-neutral-950 p-3 lg:block">
      <p className="mb-2 px-1 text-xs font-medium text-neutral-500">Drag a block onto the canvas</p>
      {CATEGORY_ORDER.map((category) => {
        const items = FLOW_NODE_TYPES.filter((n) => n.category === category);
        if (items.length === 0) return null;
        return (
          <div key={category} className="mb-4">
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">{category}</p>
            <div className="space-y-1.5">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/flow-node-type", item.type);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    title={item.description}
                    className="flex cursor-grab items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-2 text-xs text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800 active:cursor-grabbing"
                  >
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", item.color)} aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
