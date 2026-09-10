import type { PrismaClient } from "../client/client";
import { addHours } from "date-fns";
import { buildScaledDailySeries, dateForIndex, last90in30DaySegments, NUM_DAYS } from "./series";
import { AUTOMATION_BLUEPRINTS } from "./automations";

const GROWTH_RATIO = 1.221; // matches the +22.1% "messages sent" headline growth

const USERNAME_ADJ = ["cosmic", "daily", "urban", "quiet", "bold", "bright", "lucky", "chill", "sunny", "wild"];
const USERNAME_NOUN = ["fox", "creator", "coder", "nova", "maven", "spark", "pixel", "drift", "wolf", "atlas"];

function randomUsername(rng: () => number) {
  const a = USERNAME_ADJ[Math.floor(rng() * USERNAME_ADJ.length)];
  const n = USERNAME_NOUN[Math.floor(rng() * USERNAME_NOUN.length)];
  return `${a}.${n}${Math.floor(rng() * 9999)}`;
}

const REVENUE_PER_CONVERSION_CENTS = 14300; // ~₹143 avg order value (paise)

export async function seedFunnel(
  prisma: PrismaClient,
  workspaceId: string,
  socialAccountId: string,
  postIdByIndex: Map<number, string>,
  automationsByKey: Record<string, { automationId: string; linkId?: string }>,
  rng: () => number,
) {
  const tagDefs = [
    { key: "ai-roadmap", name: "ai-roadmap-lead", color: "#8b5cf6" },
    { key: "ml-guide", name: "ml-guide-lead", color: "#06b6d4" },
    { key: "templates", name: "template-lead", color: "#f59e0b" },
  ];
  const tagIdByKey = new Map<string, string>();
  for (const t of tagDefs) {
    const tag = await prisma.tag.upsert({
      where: { workspaceId_name: { workspaceId, name: t.name } },
      update: {},
      create: { workspaceId, name: t.name, color: t.color },
    });
    tagIdByKey.set(t.key, tag.id);
  }

  // Clean slate for idempotent re-seeding.
  await prisma.linkClick.deleteMany({ where: { link: { workspaceId } } });
  await prisma.conversion.deleteMany({ where: { workspaceId } });
  await prisma.lead.deleteMany({ where: { workspaceId } });
  await prisma.contactTag.deleteMany({ where: { contact: { workspaceId } } });
  await prisma.contact.deleteMany({ where: { workspaceId } });
  await prisma.metricSnapshot.deleteMany({
    where: { workspaceId, metricName: { startsWith: "autodm_" } },
  });

  const metricRows: {
    workspaceId: string;
    metricName: string;
    value: number;
    unit: "COUNT" | "CURRENCY";
    timestamp: Date;
    accountId: string;
    automationId: string;
  }[] = [];

  for (const bp of AUTOMATION_BLUEPRINTS) {
    if (!bp.currentPeriodMatches || bp.targetPostIndexes.length === 0) continue;
    const info = automationsByKey[bp.key];
    if (!info) continue;

    const targetPostIds = bp.targetPostIndexes
      .map((idx) => postIdByIndex.get(idx))
      .filter((id): id is string => !!id);
    if (targetPostIds.length === 0) continue;

    const segs = last90in30DaySegments(bp.currentPeriodMatches, GROWTH_RATIO);
    const dailyMatches = buildScaledDailySeries(
      rng,
      NUM_DAYS,
      bp.currentPeriodMatches / 30,
      0.5,
      [segs.oldest, segs.mid, segs.current],
    );

    for (let i = 0; i < NUM_DAYS; i++) {
      const M = dailyMatches[i];
      if (M <= 0) continue;
      const date = dateForIndex(i);

      const sentCount = Math.round(M * (bp.sentRate ?? 0.95));
      const deliveredCount = Math.round(sentCount * (bp.deliveredRate ?? 0.98));
      const linkClickedCount = Math.min(
        deliveredCount,
        Math.round(sentCount * (bp.linkClickRateOfSent ?? 0.5)),
      );
      const leadCount = Math.min(
        linkClickedCount,
        Math.round(linkClickedCount * (bp.leadRateOfClicks ?? 0.25)),
      );
      const convertedCount = Math.min(
        leadCount,
        Math.round(leadCount * (bp.convRateOfLeads ?? 0.15)),
      );

      metricRows.push(
        { workspaceId, metricName: "autodm_dms_sent", value: sentCount, unit: "COUNT", timestamp: date, accountId: socialAccountId, automationId: info.automationId },
        { workspaceId, metricName: "autodm_dms_delivered", value: deliveredCount, unit: "COUNT", timestamp: date, accountId: socialAccountId, automationId: info.automationId },
        { workspaceId, metricName: "autodm_link_clicks", value: linkClickedCount, unit: "COUNT", timestamp: date, accountId: socialAccountId, automationId: info.automationId },
        { workspaceId, metricName: "autodm_leads", value: leadCount, unit: "COUNT", timestamp: date, accountId: socialAccountId, automationId: info.automationId },
        { workspaceId, metricName: "autodm_conversions", value: convertedCount, unit: "COUNT", timestamp: date, accountId: socialAccountId, automationId: info.automationId },
        { workspaceId, metricName: "autodm_revenue", value: convertedCount * (REVENUE_PER_CONVERSION_CENTS / 100), unit: "CURRENCY", timestamp: date, accountId: socialAccountId, automationId: info.automationId },
      );

      // 1) Comments (the keyword-matching ones) for this day.
      const commentsData = Array.from({ length: M }, (_, j) => ({
        postId: targetPostIds[j % targetPostIds.length],
        externalId: `demo_comment_${bp.key}_${i}_${j}`,
        authorUsername: randomUsername(rng),
        text: `${bp.keywordGroup[0]}! 🙋`,
        createdAtPlatform: addHours(date, Math.floor(rng() * 20)),
        matchedAutomationId: info.automationId,
      }));
      const comments = await prisma.comment.createManyAndReturn({ data: commentsData });

      // 2) AutomationRun rows — nested funnel: each stage is a strict subset
      // of the previous one (index 0..sentCount reaches "sent", etc.).
      const runsData = comments.map((comment: { id: string; createdAtPlatform: Date }, j: number) => {
        const triggeredAt = comment.createdAtPlatform;
        const reachedSent = j < sentCount;
        const reachedDelivered = j < deliveredCount;
        const reachedClicked = j < linkClickedCount;
        const reachedLead = j < leadCount;
        const reachedConverted = j < convertedCount;

        const dmSentAt = reachedSent ? addHours(triggeredAt, 0.05) : null;
        const dmDeliveredAt = reachedDelivered ? addHours(triggeredAt, 0.1) : null;
        const dmOpenedAt = reachedClicked ? addHours(triggeredAt, 1 + rng() * 4) : null;
        const linkClickedAt = reachedClicked ? addHours(triggeredAt, 1.2 + rng() * 4) : null;
        const leadCapturedAt = reachedLead ? addHours(triggeredAt, 1.5 + rng() * 5) : null;
        const convertedAt = reachedConverted ? addHours(triggeredAt, 24 + rng() * 48) : null;

        const status = reachedConverted
          ? "CONVERTED"
          : reachedLead
            ? "LEAD"
            : reachedClicked
              ? "LINK_CLICKED"
              : reachedDelivered
                ? "DM_DELIVERED"
                : reachedSent
                  ? "DM_SENT"
                  : "TRIGGERED";

        return {
          automationId: info.automationId,
          commentId: comment.id,
          triggeredAt,
          publicReplySentAt: reachedSent ? addHours(triggeredAt, 0.02) : null,
          dmSentAt,
          dmDeliveredAt,
          dmOpenedAt,
          linkClickedAt,
          leadCapturedAt,
          convertedAt,
          revenueCents: reachedConverted ? REVENUE_PER_CONVERSION_CENTS : null,
          status: status as
            | "TRIGGERED"
            | "DM_SENT"
            | "DM_DELIVERED"
            | "LINK_CLICKED"
            | "LEAD"
            | "CONVERTED",
        };
      });

      const runs = await prisma.automationRun.createManyAndReturn({ data: runsData });

      // 3) Contacts + Leads for rows that captured an email, LinkClicks for
      // every row that clicked, Conversions for rows that converted.
      const tagId = tagIdByKey.get(bp.key);
      for (let j = 0; j < runs.length; j++) {
        const run = runs[j];
        const comment = comments[j];
        if (j >= linkClickedCount) continue;

        let contactId: string | undefined;
        if (j < leadCount) {
          const contact = await prisma.contact.create({
            data: {
              workspaceId,
              platformUsername: comment.authorUsername,
              email: `${comment.authorUsername.replace(/\./g, "_")}@example.com`,
              source: "AUTODM",
            },
          });
          contactId = contact.id;
          if (tagId) {
            await prisma.contactTag.create({ data: { contactId: contact.id, tagId } });
          }
          await prisma.automationRun.update({
            where: { id: run.id },
            data: { contactId: contact.id },
          });

          const lead = await prisma.lead.create({
            data: {
              workspaceId,
              contactId: contact.id,
              automationId: info.automationId,
              sourceLinkId: info.linkId,
              capturedAt: run.leadCapturedAt ?? run.triggeredAt,
              status: j < convertedCount ? "CUSTOMER" : "ENGAGED",
            },
          });

          if (j < convertedCount) {
            await prisma.conversion.create({
              data: {
                workspaceId,
                leadId: lead.id,
                automationId: info.automationId,
                linkId: info.linkId,
                amountCents: REVENUE_PER_CONVERSION_CENTS,
                currency: "INR",
                occurredAt: run.convertedAt ?? run.triggeredAt,
                source: "AUTODM",
              },
            });
          }
        }

        if (info.linkId) {
          await prisma.linkClick.create({
            data: {
              linkId: info.linkId,
              contactId,
              isUniqueForContact: true,
              clickedAt: run.linkClickedAt ?? run.triggeredAt,
            },
          });
        }
      }
    }
  }

  if (metricRows.length > 0) {
    await prisma.metricSnapshot.createMany({ data: metricRows });
  }
}
