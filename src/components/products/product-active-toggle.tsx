"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleProductActiveAction } from "@/server/actions/products";

export function ProductActiveToggle({ productId, isActive }: { productId: string; isActive: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleProductActiveAction(productId, !isActive);
          router.refresh();
        })
      }
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        isActive ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
      }`}
    >
      {isActive ? "Listed — click to unlist" : "Unlisted — click to list"}
    </button>
  );
}
