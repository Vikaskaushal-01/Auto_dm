import Link from "next/link";
import Image from "next/image";
import { Globe, Camera } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getInstagramConnector } from "@/lib/connectors/instagram";
import { computeMetrics } from "@/lib/analytics/metrics";
import { getDailySeries } from "@/lib/analytics/aggregate";
import { resolvePeriod, type PeriodKey } from "@/lib/analytics/periods";
import { MetricCard } from "@/components/analytics/metric-card";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { formatCount } from "@/lib/analytics/format";
import { Button } from "@/components/ui/button";
import type { MetricUnit } from "@/lib/analytics/format";

const PROFILE_METRICS: { key: string; label: string; unit: MetricUnit; compact?: boolean }[] = [
  { key: "followers", label: "Followers", unit: "COUNT" },
  { key: "following", label: "Following", unit: "COUNT" },
  { key: "profile_visits", label: "Profile Visits", unit: "COUNT" },
  { key: "website_clicks", label: "Website Clicks", unit: "COUNT" },
  { key: "engagement_rate", label: "Engagement Rate", unit: "PERCENT" },
];

export default async function ProfileAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = (["today", "7d", "30d", "90d"].includes(periodParam ?? "")
    ? periodParam
    : "30d") as PeriodKey;

  const { workspaceId, socialAccount } = await getCurrentWorkspaceContext();

  if (!socialAccount) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Profile Analytics</h1>
          <p className="mt-1 text-sm text-neutral-400">Account overview and growth performance.</p>
        </div>
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 p-12 text-center">
          <Camera className="mx-auto h-10 w-10 text-neutral-600" />
          <h3 className="mt-4 text-base font-semibold text-white">No account connected</h3>
          <p className="mt-1 text-sm text-neutral-400 max-w-sm mx-auto">
            Connect your Instagram Business account to view live followers, profile visits, and engagement analytics.
          </p>
          <Link href="/settings/integrations" className="mt-5 inline-block">
            <Button className="bg-violet-600 hover:bg-violet-500 text-white">
              Connect Account in Settings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const scope = { workspaceId, accountId: socialAccount.id };
  const { current: currentRange } = resolvePeriod(period);

  const connector = await getInstagramConnector(socialAccount.id);
  const metricKeys = PROFILE_METRICS.map((m) => m.key);

  const [profile, metrics, sparklines] = await Promise.all([
    connector.getProfile(socialAccount.id),
    computeMetrics(metricKeys, scope, period),
    Promise.all(
      metricKeys.map(async (key) => {
        const series = await getDailySeries(key, scope, currentRange);
        return [key, series.map((p) => p.value)] as const;
      }),
    ).then((entries) => Object.fromEntries(entries) as Record<string, number[]>),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">Profile Analytics</h1>
        <PeriodSelector active={period} basePath="/analytics/profile" />
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-neutral-800">
          {profile.avatarUrl && (
            <Image src={profile.avatarUrl} alt="" fill sizes="64px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white">@{profile.username}</p>
          {profile.displayName && <p className="text-sm text-neutral-400">{profile.displayName}</p>}
          {profile.bio && <p className="mt-1 max-w-xl text-sm text-neutral-400">{profile.bio}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
            {profile.website && (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3" aria-hidden />
                {profile.website}
              </span>
            )}
            <span>{formatCount(profile.mediaCount)} posts</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROFILE_METRICS.map((m) => (
          <MetricCard
            key={m.key}
            title={m.label}
            metric={metrics[m.key]}
            unit={m.unit}
            compact={m.compact}
            sparklineData={sparklines[m.key]}
          />
        ))}
      </div>
    </div>
  );
}
