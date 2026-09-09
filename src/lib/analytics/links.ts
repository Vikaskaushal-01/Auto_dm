import { db } from "@/lib/db";
import { getMetricValue } from "./aggregate";
import type { DateRange } from "./periods";

export interface LinkSummary {
  id: string;
  label: string;
  shortSlug: string;
  destinationUrl: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  automationId: string | null;
  automationName: string | null;
  sent: number;
  clicks: number;
  uniqueClicks: number;
  repeatClicks: number;
  openRate: number; // clicks / sent, as a percentage
  leads: number;
  conversions: number;
  revenueCents: number;
}

export async function getLinkSummaries(
  workspaceId: string,
  range: DateRange,
): Promise<LinkSummary[]> {
  const links = await db.link.findMany({
    where: { workspaceId },
    include: { automation: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    links.map(async (link) => {
      const [clicksTotal, uniqueClicks, leads, conversionAgg, sentMetric] = await Promise.all([
        db.linkClick.count({
          where: { linkId: link.id, clickedAt: { gte: range.start, lte: range.end } },
        }),
        db.linkClick.count({
          where: {
            linkId: link.id,
            isUniqueForContact: true,
            clickedAt: { gte: range.start, lte: range.end },
          },
        }),
        db.lead.count({
          where: { sourceLinkId: link.id, capturedAt: { gte: range.start, lte: range.end } },
        }),
        db.conversion.aggregate({
          where: { linkId: link.id, occurredAt: { gte: range.start, lte: range.end } },
          _count: true,
          _sum: { amountCents: true },
        }),
        link.automationId
          ? getMetricValue("autodm_dms_sent", { workspaceId, automationId: link.automationId }, range)
          : null,
      ]);

      const sent = sentMetric ?? 0;

      return {
        id: link.id,
        label: link.label,
        shortSlug: link.shortSlug,
        destinationUrl: link.destinationUrl,
        utmSource: link.utmSource,
        utmMedium: link.utmMedium,
        utmCampaign: link.utmCampaign,
        automationId: link.automationId,
        automationName: link.automation?.name ?? null,
        sent,
        clicks: clicksTotal,
        uniqueClicks,
        repeatClicks: clicksTotal - uniqueClicks,
        openRate: sent > 0 ? (clicksTotal / sent) * 100 : 0,
        leads,
        conversions: conversionAgg._count,
        revenueCents: conversionAgg._sum?.amountCents ?? 0,
      };
    }),
  );
}
