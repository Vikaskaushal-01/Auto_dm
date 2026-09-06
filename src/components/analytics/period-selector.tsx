import Link from "next/link";
import { cn } from "@/lib/utils";
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/analytics/periods";

export function PeriodSelector({
  active,
  basePath,
}: {
  active: PeriodKey;
  basePath: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/60 p-1">
      {PERIOD_OPTIONS.map((opt) => (
        <Link
          key={opt.key}
          href={`${basePath}?period=${opt.key}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            active === opt.key
              ? "bg-violet-600 text-white"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-white",
          )}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
