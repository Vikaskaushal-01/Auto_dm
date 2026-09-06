"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

export function ConfirmDeleteButton({
  onConfirm,
  label = "Delete",
  confirmLabel = "Confirm delete",
}: {
  onConfirm: () => Promise<void>;
  label?: string;
  confirmLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(onConfirm)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {isPending ? "Deleting..." : confirmLabel}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
    >
      <Trash2 className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
