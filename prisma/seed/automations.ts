import type { PrismaClient } from "../client/client";

export interface AutomationBlueprint {
  key: "ai-roadmap" | "ml-guide" | "templates" | "pricing-draft";
  name: string;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  keywordGroup: string[];
  matchType: "EXACT" | "CONTAINS" | "ANY";
  targetPostIndexes: number[];
  linkLabel?: string;
  linkDestination?: string;
  linkSlug?: string;
  dmBody?: string;
  publicReplies?: string[];
  // Funnel shape — see prisma/seed/funnel.ts for how these compose.
  currentPeriodMatches?: number;
  sentRate?: number;
  deliveredRate?: number;
  linkClickRateOfSent?: number;
  leadRateOfClicks?: number;
  convRateOfLeads?: number;
}

export const AUTOMATION_BLUEPRINTS: AutomationBlueprint[] = [
  {
    key: "ai-roadmap",
    name: "AI Roadmap",
    status: "ACTIVE",
    keywordGroup: ["ai"],
    matchType: "CONTAINS",
    targetPostIndexes: [2, 13],
    linkLabel: "AI Roadmap PDF",
    linkDestination: "https://autodm.app/downloads/ai-roadmap.pdf",
    linkSlug: "ai-roadmap",
    dmBody:
      'Hey {{first_name}} 👋 here\'s the free AI roadmap you asked for! First, follow so I can send more resources your way, then drop your email below and I\'ll deliver it instantly: {{link}}',
    publicReplies: [
      "Sent! Check your DMs 📩",
      "On its way to your inbox ✨",
      "Just DMed you the roadmap 🚀",
    ],
    currentPeriodMatches: 6029,
    sentRate: 0.95,
    deliveredRate: 0.983,
    linkClickRateOfSent: 0.73,
    leadRateOfClicks: 0.242,
    convRateOfLeads: 0.14,
  },
  {
    key: "ml-guide",
    name: "ML Guide",
    status: "ACTIVE",
    keywordGroup: ["ml", "machine learning"],
    matchType: "CONTAINS",
    targetPostIndexes: [9],
    linkLabel: "ML Starter Guide",
    linkDestination: "https://autodm.app/downloads/ml-starter-guide.pdf",
    linkSlug: "ml-guide",
    dmBody:
      "Hey {{first_name}} 👋 here's the free ML starter guide! Follow + drop your email and it's yours: {{link}}",
    publicReplies: ["Sent to your DMs! 📬", "Check your inbox 👀"],
    currentPeriodMatches: 4063,
    sentRate: 0.95,
    deliveredRate: 0.983,
    linkClickRateOfSent: 0.65,
    leadRateOfClicks: 0.217,
    convRateOfLeads: 0.11,
  },
  {
    key: "templates",
    name: "Python PDF Templates",
    status: "ACTIVE",
    keywordGroup: ["template"],
    matchType: "CONTAINS",
    targetPostIndexes: [15],
    linkLabel: "Content Calendar Template",
    linkDestination: "https://autodm.app/downloads/content-calendar.pdf",
    linkSlug: "content-template",
    dmBody: "Here's your free template, {{first_name}} 🎉 {{link}}",
    publicReplies: ["Sent! 🎁"],
    currentPeriodMatches: 3015,
    sentRate: 0.95,
    deliveredRate: 0.983,
    linkClickRateOfSent: 0.78,
    leadRateOfClicks: 0.352,
    convRateOfLeads: 0.18,
  },
  {
    key: "pricing-draft",
    name: "Pricing Inquiry Bot",
    status: "DRAFT",
    keywordGroup: ["price", "cost", "how much"],
    matchType: "CONTAINS",
    targetPostIndexes: [],
  },
];

export async function seedAutomations(
  prisma: PrismaClient,
  workspaceId: string,
  socialAccountId: string,
  postIdByIndex: Map<number, string>,
) {
  await prisma.automationRun.deleteMany({ where: { automation: { workspaceId } } });
  await prisma.automationAction.deleteMany({ where: { automation: { workspaceId } } });
  await prisma.automationTrigger.deleteMany({ where: { automation: { workspaceId } } });
  await prisma.automationTargetPost.deleteMany({ where: { automation: { workspaceId } } });
  await prisma.automation.deleteMany({ where: { workspaceId } });

  const created: Record<string, { automationId: string; linkId?: string }> = {};

  for (const bp of AUTOMATION_BLUEPRINTS) {
    const automation = await prisma.automation.create({
      data: {
        workspaceId,
        socialAccountId,
        name: bp.name,
        status: bp.status,
        scope: bp.targetPostIndexes.length > 0 ? "SPECIFIC_POSTS" : "ALL_POSTS",
      },
    });

    await prisma.automationTrigger.create({
      data: {
        automationId: automation.id,
        keywordGroup: bp.keywordGroup,
        matchType: bp.matchType,
        caseSensitive: false,
      },
    });

    for (const idx of bp.targetPostIndexes) {
      const postId = postIdByIndex.get(idx);
      if (postId) {
        await prisma.automationTargetPost.create({
          data: { automationId: automation.id, postId },
        });
      }
    }

    let linkId: string | undefined;
    if (bp.linkLabel && bp.linkDestination && bp.linkSlug) {
      const link = await prisma.link.upsert({
        where: { shortSlug: bp.linkSlug },
        update: {},
        create: {
          workspaceId,
          automationId: automation.id,
          label: bp.linkLabel,
          destinationUrl: bp.linkDestination,
          shortSlug: bp.linkSlug,
          utmSource: "instagram",
          utmMedium: "autodm",
          utmCampaign: bp.key,
        },
      });
      linkId = link.id;
    }

    if (bp.publicReplies && bp.dmBody) {
      await prisma.automationAction.createMany({
        data: [
          {
            automationId: automation.id,
            order: 0,
            type: "PUBLIC_REPLY",
            publicReplyVariations: bp.publicReplies,
            tagIdsToApply: [],
          },
          {
            automationId: automation.id,
            order: 1,
            type: "SEND_DM",
            publicReplyVariations: [],
            dmContentType: "LINK",
            dmBody: bp.dmBody,
            linkId,
            requiresEmailCapture: true,
            requiresFollow: true,
            tagIdsToApply: [],
          },
        ],
      });
    }

    created[bp.key] = { automationId: automation.id, linkId };
  }

  return created;
}
