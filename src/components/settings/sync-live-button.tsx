"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncRealAccountDataAction } from "@/server/actions/sync";

export function SyncLiveButton({ socialAccountId }: { socialAccountId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await syncRealAccountDataAction(socialAccountId);
          if (res.ok) {
            alert(res.message || "Synced successfully!");
          } else {
            alert(res.error || "Sync failed.");
          }
        })
      }
      className="inline-flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white border-neutral-700"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Syncing..." : "Sync Live Data"}
    </Button>
  );
}
