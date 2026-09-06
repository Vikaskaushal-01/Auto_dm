"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createFlowAction, generateFlowAction } from "@/server/actions/flows";

const EXAMPLE_PROMPT =
  "When someone comments 'guide', send a welcome message, capture their email, then send the download link.";

export function NewFlowControls() {
  const [newFlowOpen, setNewFlowOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => setAiOpen(true)}>
        <Sparkles className="h-4 w-4" />
        Generate with AI
      </Button>
      <Button onClick={() => setNewFlowOpen(true)}>
        <Plus className="h-4 w-4" />
        New Flow
      </Button>

      {newFlowOpen && (
        <Modal onClose={() => setNewFlowOpen(false)} title="New flow">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(() => createFlowAction(name));
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-400">Flow name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Welcome DM flow" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNewFlowOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create flow"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {aiOpen && (
        <Modal onClose={() => setAiOpen(false)} title="Generate a flow from a prompt">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(() => generateFlowAction(prompt));
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-400">Describe the flow you want</label>
              <Textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={EXAMPLE_PROMPT}
                autoFocus
              />
              <p className="mt-2 text-xs text-neutral-600">
                Builds a starting draft from keywords — mentions of &quot;email&quot;, &quot;discount&quot;, &quot;link&quot;,
                &quot;follow&quot;, &quot;delay&quot;, &quot;tag&quot;, or &quot;human&quot; add matching blocks.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAiOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || prompt.trim().length === 0}>
                {isPending ? "Generating..." : "Generate flow"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
