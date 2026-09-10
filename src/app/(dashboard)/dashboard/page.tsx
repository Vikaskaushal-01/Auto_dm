import Link from "next/link";
import { ArrowRight, Camera, MessageCircle, Share2, Sparkles } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { computeMetrics } from "@/lib/analytics/metrics";
import { getDailySeries } from "@/lib/analytics/aggregate";
import { resolvePeriod, type PeriodKey } from "@/lib/analytics/periods";
import { generateInsights } from "@/lib/analytics/insights";
import { getTopContent } from "@/lib/analytics/content";
import { MetricCard } from "@/components/analytics/metric-card";
import { PeriodSelector } from "@/components/analytics/period-selector";
import { InsightsCard } from "@/components/analytics/insights-card";
import { TopContentCard } from "@/components/analytics/top-content-card";
import { Button } from "@/components/ui/button";
import type { MetricUnit } from "@/lib/analytics/format";

const ACCOUNT_HEALTH_METRICS: { key: string; label: string; unit: MetricUnit; compact?: boolean }[] = [
  { key: "followers", label: "Followers", unit: "COUNT" },
  { key: "reach", label: "Reach", unit: "COUNT", compact: true },
  { key: "engagement_rate", label: "Engagement Rate", unit: "PERCENT" },
  { key: "profile_visits", label: "Profile Visits", unit: "COUNT" },
  { key: "website_clicks", label: "Website Clicks", unit: "COUNT" },
  { key: "impressions", label: "Impressions", unit: "COUNT", compact: true },
];

const AUTODM_METRICS: { key: string; label: string; unit: MetricUnit; compact?: boolean }[] = [
  { key: "autodm_dms_sent", label: "Messages Sent", unit: "COUNT" },
  { key: "autodm_link_clicks", label: "Links Opened", unit: "COUNT" },
  { key: "autodm_leads", label: "Leads", unit: "COUNT" },
  { key: "autodm_conversions", label: "Conversions", unit: "COUNT" },
  { key: "autodm_revenue", label: "Revenue", unit: "CURRENCY" },
];

export default async function DashboardPage({
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
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Welcome to AutoDM</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Connect your social channels to start automating comments, sending DMs, capturing leads, and tracking analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Camera className="h-6 w-6" />
              </div>
              <h2 className="text-base font-semibold text-white">Instagram Business</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Automate instant DM replies to comments on your Reels and Posts. Convert engagement into leads & sales.
              </p>
            </div>
            <Link href="/settings/integrations" className="mt-6">
              <Button className="w-full justify-between bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white">
                <span>Connect Instagram</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Share2 className="h-6 w-6" />
              </div>
              <h2 className="text-base font-semibold text-white">Facebook Page</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Respond automatically to comments on your Facebook Page posts with direct Messenger conversations.
              </p>
            </div>
            <Link href="/settings/integrations" className="mt-6">
              <Button className="w-full justify-between bg-blue-600 hover:bg-blue-500 text-white">
                <span>Connect Facebook Page</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 flex flex-col justify-between hover:border-neutral-700 transition-colors">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <MessageCircle className="h-6 w-6" />
              </div>
              <h2 className="text-base font-semibold text-white">WhatsApp Cloud API</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Connect your Meta WhatsApp Business Platform for customer service, broadcast campaigns, and automated replies.
              </p>
            </div>
            <Link href="/settings/integrations" className="mt-6">
              <Button className="w-full justify-between bg-emerald-600 hover:bg-emerald-500 text-white">
                <span>Connect WhatsApp</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-violet-950/20 via-neutral-900/40 to-neutral-900/60 p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <h3 className="text-sm font-semibold text-white">What you can do with AutoDM</h3>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs text-neutral-400">
            <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/50 p-4">
              <p className="font-semibold text-white">Comment-to-DM Engine</p>
              <p className="mt-1 text-neutral-400">Keyword matching and randomized public replies with instant DMs.</p>
            </div>
            <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/50 p-4">
              <p className="font-semibold text-white">CRM & Lead Pipeline</p>
              <p className="mt-1 text-neutral-400">Automatic contact creation, tagging, email capture, and conversion attribution.</p>
            </div>
            <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/50 p-4">
              <p className="font-semibold text-white">Unified Multi-Channel Inbox</p>
              <p className="mt-1 text-neutral-400">Manage conversations across Instagram, Facebook, and WhatsApp in one place.</p>
            </div>
            <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/50 p-4">
              <p className="font-semibold text-white">Link-in-Bio & Products</p>
              <p className="mt-1 text-neutral-400">Sell digital downloads and track link clicks with built-in UTM attribution.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scope = { workspaceId, accountId: socialAccount.id };
  const { current: currentRange } = resolvePeriod(period);

  const allMetricKeys = [...ACCOUNT_HEALTH_METRICS, ...AUTODM_METRICS].map((m) => m.key);

  const [metrics, sparklines, insights, topContent] = await Promise.all([
    computeMetrics(allMetricKeys, scope, period),
    Promise.all(
      allMetricKeys.map(async (key) => {
        const series = await getDailySeries(key, scope, currentRange);
        return [key, series.map((p) => p.value)] as const;
      }),
    ).then((entries) => Object.fromEntries(entries) as Record<string, number[]>),
    generateInsights(scope),
    getTopContent(socialAccount.id, currentRange, 5, "views"),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-400">
            @{socialAccount.username} — account health, AutoDM performance, and live metrics.
          </p>
        </div>
        <PeriodSelector active={period} basePath="/dashboard" />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Account Health
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {ACCOUNT_HEALTH_METRICS.map((m) => (
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
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          AutoDM
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {AUTODM_METRICS.map((m) => (
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
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopContentCard posts={topContent} />
        <InsightsCard insights={insights} />
      </section>
    </div>
  );
}
