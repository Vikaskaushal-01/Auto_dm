"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wipeDemoDataAction } from "@/server/actions/data-management";

export function WipeDemoButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const handleWipe = () => {
    startTransition(async () => {
      const res = await wipeDemoDataAction();
      if (res.ok) {
        setConfirming(false);
        router.refresh();
      } else {
        alert(res.error || "Failed to wipe demo data");
      }
    });
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-amber-400">Delete all seeded demo data?</span>
        <Button
          type="button"
          size="sm"
          variant="primary"
          disabled={isPending}
          onClick={handleWipe}
          className="bg-red-600 hover:bg-red-500 text-white text-xs px-2.5 py-1"
        >
          {isPending ? "Wiping..." : "Confirm Wipe"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => setConfirming(false)}
          className="text-xs px-2 py-1"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-red-900/50 text-xs"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Clear All Demo Data
    </Button>
  );
}
