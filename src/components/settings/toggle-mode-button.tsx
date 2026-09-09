"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { togglePlatformModeAction } from "@/server/actions/settings";

interface ToggleModeButtonProps {
  socialAccountId: string;
  currentMode: "LIVE" | "DEMO";
}

export function ToggleModeButton({ socialAccountId, currentMode }: ToggleModeButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isLive = currentMode === "LIVE";

  const handleToggle = () => {
    startTransition(async () => {
      await togglePlatformModeAction(socialAccountId);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        isLive
          ? "border-amber-800/60 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30"
          : "border-emerald-800/60 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/30"
      } ${isPending ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
      <span>
        {isPending
          ? "Switching..."
          : isLive
            ? "Switch to Demo Mode"
            : "Switch to Live Mode"}
      </span>
    </button>
  );
}
