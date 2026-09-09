import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Zap } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { db } from "@/lib/db";
import { computeMetrics } from "@/lib/analytics/metrics";
import { getDailySeries } from "@/lib/analytics/aggregate";
import { resolvePeriod, type PeriodKey } from "@/lib/analytics/periods";
import { getAutomationFunnel } from "@/lib/analytics/funnel";
import { MetricCard } from "@/components/analytics/metric-card";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { formatCurrencyINR } from "@/lib/analytics/format";
import type { MetricUnit } from "@/lib/analytics/format";

const REEL_METRICS: { key: string; label: string; unit: MetricUnit }[] = [
  { key: "views", label: "Views" },
  { key: "reach", label: "Reach" },
  { key: "impressions", label: "Impressions" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "saves", label: "Saves" },
  { key: "engagementRate", label: "Engagement Rate", unit: "PERCENT" },
  { key: "profileVisits", label: "Profile Visits" },
  { key: "followersGained", label: "Followers Gained" },
  { key: "linkClicks", label: "Link Clicks" },
].map((m) => ({ ...m, unit: m.unit ?? "COUNT" }) as { key: string; label: string; unit: MetricUnit });

export default async function ReelDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reelId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { reelId } = await params;
  const { period: periodParam } = await searchParams;
  const period = (["today", "7d", "30d", "90d"].includes(periodParam ?? "")
    ? periodParam
    : "30d") as PeriodKey;

  const { workspaceId, socialAccount } = await getCurrentWorkspaceContext();

  const post = await db.post.findFirst({
    where: { id: reelId, socialAccountId: socialAccount.id },
  });
  if (!post) notFound();

  const targets = await db.automationTargetPost.findMany({
    where: { postId: post.id },
    include: { automation: { select: { id: true, name: true } } },
  });
  const automationIds = targets.map((t) => t.automationId);

  const { current: currentRange } = resolvePeriod(period);
  const scope = { workspaceId, contentId: post.id };
  const metricKeys = REEL_METRICS.map((m) => m.key);

  const [metrics, funnel, sparklineEntries] = await Promise.all([
    computeMetrics(metricKeys, scope, period),
    automationIds.length > 0
      ? getAutomationFunnel(
          { automationId: { in: automationIds }, comment: { postId: post.id } },
          currentRange,
        )
      : null,
    Promise.all(
      metricKeys.map(async (key) => {
        const pts = await getDailySeries(key, scope, currentRange);
        return [key, pts.map((p) => p.value)] as const;
      }),
    ),
  ]);

  const sparklines = Object.fromEntries(sparklineEntries);

  return (
    <div className="space-y-6">
      <Link
        href="/analytics/content"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to Content
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
            {post.thumbnailUrl && (
              <Image src={post.thumbnailUrl} alt="" fill sizes="80px" className="object-cover" />
            )}
          </div>
          <div>
            <h1 className="max-w-xl text-lg font-semibold text-white">{post.caption ?? "Untitled"}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {post.type} · Published {new Date(post.publishedAt).toLocaleDateString()}
            </p>
            {automationIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {targets.map((t) => (
                  <span
                    key={t.automationId}
                    className="inline-flex items-center gap-1 rounded-full bg-violet-600/15 px-2.5 py-1 text-xs text-violet-300"
                  >
                    <Zap className="h-3 w-3" aria-hidden />
                    {t.automation.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <PeriodSelector active={period} basePath={`/analytics/content/${post.id}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REEL_METRICS.map((m) => (
          <MetricCard
            key={m.key}
            title={m.label}
            metric={metrics[m.key]}
            unit={m.unit}
            sparklineData={sparklines[m.key]}
          />
        ))}
      </div>

      {funnel && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">AutoDM Performance</h2>
            <span className="text-sm font-medium text-emerald-400">
              {formatCurrencyINR(funnel.revenueCents / 100)} revenue
            </span>
          </div>
          <FunnelChart stages={funnel.stages} />
        </div>
      )}
    </div>
  );
}
