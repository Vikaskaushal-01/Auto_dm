import { computeMetric } from "./metrics";
import type { MetricScope } from "./aggregate";

export interface Insight {
  headline: string;
  severity: "positive" | "negative" | "neutral";
}

/**
 * Deterministic, rule-based "AI insight" generator for Phase 1 — every
 * headline is just a computeMetric() result run through a template chosen
 * by trend direction and magnitude. Kept behind this same
 * {headline, severity}[] contract so a future LLM-backed generator can
 * replace the implementation without touching any consuming component.
 */
export async function generateInsights(scope: MetricScope): Promise<Insight[]> {
  const [followers, reach, visits, dmsSent, linkClicks, leads] = await Promise.all([
    computeMetric("followers", scope, "30d"),
    computeMetric("reach", scope, "30d"),
    computeMetric("profile_visits", scope, "30d"),
    computeMetric("autodm_dms_sent", scope, "30d"),
    computeMetric("autodm_link_clicks", scope, "30d"),
    computeMetric("autodm_leads", scope, "30d"),
  ]);

  const insights: Insight[] = [];

  if (followers.hasComparison && followers.percentageChange !== null && followers.trend !== "flat") {
    insights.push({
      headline: `Followers ${followers.trend === "up" ? "increased" : "decreased"} ${Math.abs(followers.percentageChange).toFixed(1)}% this month.`,
      severity: followers.trend === "up" ? "positive" : "negative",
    });
  }

  if (dmsSent.current > 0 && linkClicks.current > 0) {
    const openRate = (linkClicks.current / dmsSent.current) * 100;
    const prevOpenRate =
      dmsSent.previous && dmsSent.previous > 0 && linkClicks.previous !== null
        ? (linkClicks.previous / dmsSent.previous) * 100
        : null;

    if (prevOpenRate !== null) {
      const diff = openRate - prevOpenRate;
      insights.push({
        headline:
          Math.abs(diff) >= 0.5
            ? `Your AutoDM link open rate ${diff >= 0 ? "increased" : "decreased"} ${Math.abs(diff).toFixed(1)} points to ${openRate.toFixed(1)}%.`
            : `Your AutoDM link open rate held steady at ${openRate.toFixed(1)}%.`,
        severity: diff >= 0 ? "positive" : "negative",
      });
    } else {
      insights.push({
        headline: `Your AutoDM link open rate is ${openRate.toFixed(1)}% this month.`,
        severity: "neutral",
      });
    }
  }

  if (leads.hasComparison && leads.percentageChange !== null && leads.trend !== "flat") {
    insights.push({
      headline: `Leads generated via AutoDM are ${leads.trend === "up" ? "up" : "down"} ${Math.abs(leads.percentageChange).toFixed(1)}% this month.`,
      severity: leads.trend === "up" ? "positive" : "negative",
    });
  }

  if (visits.hasComparison && visits.percentageChange !== null && visits.trend !== "flat") {
    insights.push({
      headline: `Your Reels generated ${Math.abs(visits.percentageChange).toFixed(1)}% ${visits.trend === "up" ? "more" : "fewer"} profile visits than last month.`,
      severity: visits.trend === "up" ? "positive" : "negative",
    });
  }

  if (reach.hasComparison && reach.percentageChange !== null && reach.trend !== "flat") {
    insights.push({
      headline: `Reach is ${reach.trend === "up" ? "up" : "down"} ${Math.abs(reach.percentageChange).toFixed(1)}% versus the previous 30 days.`,
      severity: reach.trend === "up" ? "positive" : "negative",
    });
  }

  return insights.slice(0, 5);
}
