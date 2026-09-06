"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Trash2, Plus, MousePointerClick } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  addBioLinkAction,
  updateBioLinkAction,
  deleteBioLinkAction,
  moveBioLinkAction,
} from "@/server/actions/bio";

export interface BioLinkItem {
  id: string;
  label: string;
  url: string;
  clicks: number;
}

export function BioLinkList({ bioPageId, links }: { bioPageId: string; links: BioLinkItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  function refresh() {
    router.refresh();
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim() || !newUrl.trim()) return;
    startTransition(async () => {
      await addBioLinkAction(bioPageId, newLabel, newUrl);
      setNewLabel("");
      setNewUrl("");
      refresh();
    });
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <h2 className="mb-3 text-sm font-semibold text-white">Links</h2>

      <div className="space-y-3">
        {links.map((link, index) => (
          <LinkRow
            key={link.id}
            link={link}
            isFirst={index === 0}
            isLast={index === links.length - 1}
            onSaved={refresh}
          />
        ))}
        {links.length === 0 && <p className="text-sm text-neutral-500">No links yet — add your first below.</p>}
      </div>

      <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-2 border-t border-neutral-800 pt-4 sm:flex-row">
        <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Link text" className="sm:flex-1" />
        <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." className="sm:flex-1" />
        <Button type="submit" disabled={isPending}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>
    </div>
  );
}

function LinkRow({
  link,
  isFirst,
  isLast,
  onSaved,
}: {
  link: BioLinkItem;
  isFirst: boolean;
  isLast: boolean;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(link.label);
  const [url, setUrl] = useState(link.url);
  const [isPending, startTransition] = useTransition();

  function commit() {
    if (label === link.label && url === link.url) return;
    startTransition(async () => {
      await updateBioLinkAction(link.id, label, url);
      onSaved();
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 p-2.5">
      <div className="flex flex-col">
        <button
          type="button"
          disabled={isFirst || isPending}
          onClick={() => startTransition(async () => { await moveBioLinkAction(link.id, "up"); onSaved(); })}
          className="rounded p-0.5 text-neutral-500 hover:bg-neutral-800 hover:text-white disabled:opacity-20"
          aria-label="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={isLast || isPending}
          onClick={() => startTransition(async () => { await moveBioLinkAction(link.id, "down"); onSaved(); })}
          className="rounded p-0.5 text-neutral-500 hover:bg-neutral-800 hover:text-white disabled:opacity-20"
          aria-label="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} onBlur={commit} />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} onBlur={commit} />
      </div>
      <span className="hidden shrink-0 items-center gap-1 text-xs text-neutral-500 sm:flex">
        <MousePointerClick className="h-3.5 w-3.5" />
        {link.clicks}
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(async () => { await deleteBioLinkAction(link.id); onSaved(); })}
        className="shrink-0 rounded p-1.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
        aria-label="Delete link"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
