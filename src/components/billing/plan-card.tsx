"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrencyINR } from "@/lib/analytics/format";
import type { PlanDef } from "@/lib/plans";
import { changePlanAction } from "@/server/actions/billing";

export function PlanCard({
  planDef,
  isCurrent,
  isDowngrade,
}: {
  planDef: PlanDef;
  isCurrent: boolean;
  isDowngrade: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className={`flex flex-col rounded-xl border p-5 ${
        isCurrent ? "border-violet-500 bg-violet-500/5" : "border-neutral-800 bg-neutral-900/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{planDef.label}</h3>
        {isCurrent && (
          <span className="rounded-full bg-violet-600/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">Current plan</span>
        )}
      </div>
      <p className="mt-1 text-xs text-neutral-500">{planDef.tagline}</p>
      <p className="mt-3 text-2xl font-semibold text-white">
        {planDef.priceRupees === 0 ? "Free" : formatCurrencyINR(planDef.priceRupees)}
        {planDef.priceRupees > 0 && <span className="text-sm font-normal text-neutral-500">/mo</span>}
      </p>

      <ul className="mt-4 flex-1 space-y-1.5">
        {planDef.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-xs text-neutral-400">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
            {f}
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant={isCurrent ? "outline" : "primary"}
        disabled={isCurrent || isPending}
        className="mt-5"
        onClick={() =>
          startTransition(async () => {
            await changePlanAction(planDef.plan);
            router.refresh();
          })
        }
      >
        {isPending ? "Switching..." : isCurrent ? "Current plan" : isDowngrade ? "Downgrade" : "Upgrade"}
      </Button>
    </div>
  );
}
