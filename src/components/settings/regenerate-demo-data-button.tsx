"use client";

import { useState, useTransition } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { regenerateDemoDataAction } from "@/server/actions/settings";

export function RegenerateDemoDataButton() {
  const [confirming, setConfirming] = useState(false);
  const [started, setStarted] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (started) {
    return (
      <p className="text-sm text-emerald-400">
        Regeneration started — this takes about 5 minutes. Refresh the dashboard after that to
        see fresh data.
      </p>
    );
  }

  if (!confirming) {
    return (
      <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
        <RefreshCw className="h-4 w-4" aria-hidden />
        Regenerate Demo Data
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-amber-600/40 bg-amber-500/5 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        <p className="text-sm text-amber-200">
          This replaces your follower history, content, and automations (including any you&apos;ve
          created) with a fresh randomized demo dataset. This can&apos;t be undone.
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await regenerateDemoDataAction();
              setStarted(true);
            })
          }
        >
          {isPending ? "Starting..." : "Yes, regenerate"}
        </Button>
      </div>
    </div>
  );
}
