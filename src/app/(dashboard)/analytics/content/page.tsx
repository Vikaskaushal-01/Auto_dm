import Link from "next/link";
import Image from "next/image";
import { Zap } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getContentSummaries, type ContentSummary } from "@/lib/analytics/content";
import { resolvePeriod, type PeriodKey } from "@/lib/analytics/periods";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { formatCompact, formatCount, formatPercent } from "@/lib/analytics/format";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { key: keyof ContentSummary; label: string }[] = [
  { key: "publishedAt", label: "Date Uploaded" },
  { key: "views", label: "Views" },
  { key: "reach", label: "Reach" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "saves", label: "Saves" },
  { key: "engagementRate", label: "Engagement" },
  { key: "followersGained", label: "Followers" },
  { key: "linkClicks", label: "Link Clicks" },
];

export default async function ContentAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; sort?: string }>;
}) {
  const { period: periodParam, sort: sortParam } = await searchParams;
  const period = (["today", "7d", "30d", "90d"].includes(periodParam ?? "")
    ? periodParam
    : "30d") as PeriodKey;
  const sortBy = (SORT_OPTIONS.some((o) => o.key === sortParam) ? sortParam : "publishedAt") as keyof ContentSummary;

  const { socialAccount } = await getCurrentWorkspaceContext();
  const { current: currentRange } = resolvePeriod(period);

  const summaries = await getContentSummaries(socialAccount.id, currentRange);
  const sorted = [...summaries].sort((a, b) => {
    if (sortBy === "publishedAt") {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }
    return (Number(b[sortBy]) || 0) - (Number(a[sortBy]) || 0);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Content</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Every post and reel for @{socialAccount.username}, sorted by{" "}
            {sortBy === "publishedAt"
              ? "date uploaded (newest first)"
              : sortBy === "engagementRate"
                ? "engagement"
                : String(sortBy)}
            .
          </p>
        </div>
        <PeriodSelector active={period} basePath="/analytics/content" />
      </div>

      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((opt) => (
          <Link
            key={opt.key}
            href={`/analytics/content?period=${period}&sort=${opt.key}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              sortBy === opt.key
                ? "bg-violet-600 text-white"
                : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white",
            )}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 font-medium">
                  <Link
                    href={`/analytics/content?period=${period}&sort=publishedAt`}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-white",
                      sortBy === "publishedAt" && "text-violet-400 font-semibold",
                    )}
                  >
                    Content / Date {sortBy === "publishedAt" && "↓"}
                  </Link>
                </th>
                <th className="px-3 py-3 font-medium">
                  <Link
                    href={`/analytics/content?period=${period}&sort=views`}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-white",
                      sortBy === "views" && "text-violet-400 font-semibold",
                    )}
                  >
                    Views {sortBy === "views" && "↓"}
                  </Link>
                </th>
                <th className="px-3 py-3 font-medium">
                  <Link
                    href={`/analytics/content?period=${period}&sort=reach`}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-white",
                      sortBy === "reach" && "text-violet-400 font-semibold",
                    )}
                  >
                    Reach {sortBy === "reach" && "↓"}
                  </Link>
                </th>
                <th className="px-3 py-3 font-medium">
                  <Link
                    href={`/analytics/content?period=${period}&sort=likes`}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-white",
                      sortBy === "likes" && "text-violet-400 font-semibold",
                    )}
                  >
                    Likes {sortBy === "likes" && "↓"}
                  </Link>
                </th>
                <th className="px-3 py-3 font-medium">
                  <Link
                    href={`/analytics/content?period=${period}&sort=comments`}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-white",
                      sortBy === "comments" && "text-violet-400 font-semibold",
                    )}
                  >
                    Comments {sortBy === "comments" && "↓"}
                  </Link>
                </th>
                <th className="px-3 py-3 font-medium">
                  <Link
                    href={`/analytics/content?period=${period}&sort=engagementRate`}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-white",
                      sortBy === "engagementRate" && "text-violet-400 font-semibold",
                    )}
                  >
                    Engagement {sortBy === "engagementRate" && "↓"}
                  </Link>
                </th>
                <th className="px-3 py-3 font-medium">
                  <Link
                    href={`/analytics/content?period=${period}&sort=followersGained`}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-white",
                      sortBy === "followersGained" && "text-violet-400 font-semibold",
                    )}
                  >
                    Followers {sortBy === "followersGained" && "↓"}
                  </Link>
                </th>
                <th className="px-3 py-3 font-medium">
                  <Link
                    href={`/analytics/content?period=${period}&sort=linkClicks`}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-white",
                      sortBy === "linkClicks" && "text-violet-400 font-semibold",
                    )}
                  >
                    Link Clicks {sortBy === "linkClicks" && "↓"}
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((post) => (
                <tr key={post.id} className="border-b border-neutral-800/60 hover:bg-neutral-800/40">
                  <td className="px-4 py-3">
                    <Link href={`/analytics/content/${post.id}`} className="flex items-center gap-3">
                      <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-neutral-800">
                        {post.thumbnailUrl && (
                          <Image src={post.thumbnailUrl} alt="" fill sizes="36px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 max-w-xs">
                        <p className="truncate text-neutral-200">{post.caption ?? "Untitled"}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                          <span>{post.type}</span>
                          <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                          {post.hasAutomation && (
                            <span className="inline-flex items-center gap-1 text-violet-400">
                              <Zap className="h-3 w-3" aria-hidden />
                              AutoDM
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-neutral-300">{formatCompact(post.views)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatCompact(post.reach)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatCount(post.likes)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatCount(post.comments)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatPercent(post.engagementRate)}</td>
                  <td className="px-3 py-3 text-emerald-400">+{formatCount(post.followersGained)}</td>
                  <td className="px-3 py-3 text-neutral-300">{formatCount(post.linkClicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
