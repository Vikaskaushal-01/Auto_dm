import { prisma, type Platform } from "@/lib/prisma";
import { getInstagramConnector } from "@/lib/connectors/instagram";

export interface AutomationCommentInput {
  workspaceId: string;
  socialAccountId: string;
  platform?: Platform;
  postId?: string;
  commentId: string; // external or internal ID
  commentText: string;
  authorUsername: string;
}

export interface AutomationExecutionResult {
  matched: boolean;
  automationId?: string;
  automationName?: string;
  publicReply?: string;
  dmBody?: string;
  contactId?: string;
  leadId?: string;
  runId?: string;
  error?: string;
}

function matchesKeywords(
  text: string,
  keywords: string[],
  matchType: "EXACT" | "CONTAINS" | "ANY",
  caseSensitive: boolean,
): boolean {
  if (matchType === "ANY") return true;
  if (!keywords || keywords.length === 0) return true;

  const normalizedText = caseSensitive ? text.trim() : text.trim().toLowerCase();

  for (const kw of keywords) {
    const normalizedKw = caseSensitive ? kw.trim() : kw.trim().toLowerCase();
    if (!normalizedKw) continue;

    if (matchType === "EXACT" && normalizedText === normalizedKw) {
      return true;
    }
    if (matchType === "CONTAINS" && normalizedText.includes(normalizedKw)) {
      return true;
    }
  }

  return false;
}

/**
 * Core AutoDM automation execution engine.
 * Matches incoming comments against active triggers and dispatches
 * public replies, direct messages, and CRM leads.
 */
export async function processIncomingComment(
  input: AutomationCommentInput,
): Promise<AutomationExecutionResult> {
  const { workspaceId, socialAccountId, postId, commentId, commentText, authorUsername } = input;

  // 1. Fetch active automations for this account
  const automations = await prisma.automation.findMany({
    where: {
      workspaceId,
      socialAccountId,
      status: "ACTIVE",
    },
    include: {
      triggers: true,
      actions: { orderBy: { order: "asc" }, include: { link: true } },
      targetPosts: true,
    },
  });

  if (automations.length === 0) {
    return { matched: false };
  }

  // 2. Find matching automation
  for (const auto of automations) {
    // Check post scope
    if (auto.scope === "SPECIFIC_POSTS" && postId) {
      const targetsThisPost = auto.targetPosts.some((tp) => tp.postId === postId);
      if (!targetsThisPost) continue;
    }

    // Check triggers
    let triggered = auto.triggers.length === 0;
    for (const trigger of auto.triggers) {
      if (
        matchesKeywords(
          commentText,
          trigger.keywordGroup,
          trigger.matchType,
          trigger.caseSensitive,
        )
      ) {
        triggered = true;
        break;
      }
    }

    if (!triggered) continue;

    // 3. Match found! Upsert CRM Contact
    const contact = await prisma.contact.upsert({
      where: { id: `contact_${socialAccountId}_${authorUsername}` },
      update: {
        platformUsername: authorUsername,
      },
      create: {
        id: `contact_${socialAccountId}_${authorUsername}`,
        workspaceId,
        socialAccountId,
        platformUsername: authorUsername,
        firstName: authorUsername,
        source: "AUTODM",
      },
    });

    // 4. Execute Actions
    let chosenPublicReply: string | undefined;
    let chosenDmBody: string | undefined;
    let linkIdToAttach: string | undefined;

    for (const action of auto.actions) {
      if (action.type === "PUBLIC_REPLY" && action.publicReplyVariations.length > 0) {
        // Randomly pick variation to prevent rate limits
        const idx = Math.floor(Math.random() * action.publicReplyVariations.length);
        chosenPublicReply = action.publicReplyVariations[idx];

        // Replace {{first_name}} tokens
        chosenPublicReply = chosenPublicReply.replace(/\{\{first_name\}\}/gi, authorUsername);
      }

      if (action.type === "SEND_DM" && action.dmBody) {
        let body = action.dmBody.replace(/\{\{first_name\}\}/gi, authorUsername);

        if (action.link) {
          linkIdToAttach = action.link.id;
          body += `\n\n${action.link.destinationUrl}`;
        }

        chosenDmBody = body;
      }
    }

    // 5. Send public reply & DM via connector
    try {
      const igConnector = await getInstagramConnector(socialAccountId);
      if (chosenPublicReply) {
        await igConnector.replyToComment(commentId, chosenPublicReply).catch((e: unknown) => {
          console.warn("Could not dispatch public reply:", e instanceof Error ? e.message : String(e));
        });
      }

      if (chosenDmBody) {
        await igConnector
          .sendDirectMessage({
            accountId: socialAccountId,
            automationId: auto.id,
            commentId,
            toUsername: authorUsername,
            body: chosenDmBody,
            linkId: linkIdToAttach,
          })
          .catch((e: unknown) => {
            console.warn("Could not dispatch DM:", e instanceof Error ? e.message : String(e));
          });
      }
    } catch (connErr) {
      console.warn("Connector execution notice:", connErr);
    }

    // 6. Record CRM Lead
    const lead = await prisma.lead.create({
      data: {
        workspaceId,
        contactId: contact.id,
        automationId: auto.id,
        sourceLinkId: linkIdToAttach,
        status: "NEW",
      },
    });

    // 7. Resolve or record Comment to satisfy foreign key
    let persistedCommentId: string | null = null;
    if (commentId) {
      const existing = await prisma.comment.findFirst({
        where: { OR: [{ id: commentId }, { externalId: commentId }] },
        select: { id: true },
      });
      if (existing) {
        persistedCommentId = existing.id;
      } else {
        let targetPostId = postId;
        if (!targetPostId) {
          const firstPost = await prisma.post.findFirst({
            where: { socialAccountId },
            select: { id: true },
          });
          targetPostId = firstPost?.id;
        }
        if (targetPostId) {
          try {
            const createdComment = await prisma.comment.create({
              data: {
                postId: targetPostId,
                externalId: commentId,
                authorUsername,
                text: commentText,
                createdAtPlatform: new Date(),
                matchedAutomationId: auto.id,
              },
            });
            persistedCommentId = createdComment.id;
          } catch {
            persistedCommentId = null;
          }
        }
      }
    }

    // 8. Record Automation Run
    const run = await prisma.automationRun.create({
      data: {
        automationId: auto.id,
        contactId: contact.id,
        commentId: persistedCommentId,
        status: "DM_SENT",
        publicReplySentAt: chosenPublicReply ? new Date() : null,
        dmSentAt: chosenDmBody ? new Date() : null,
      },
    });

    // 8. Record Daily Metric Snapshot
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await prisma.metricSnapshot.create({
      data: {
        workspaceId,
        metricName: "autodm_dms_sent",
        value: 1,
        unit: "COUNT",
        timestamp: today,
        accountId: socialAccountId,
        automationId: auto.id,
      },
    });

    return {
      matched: true,
      automationId: auto.id,
      automationName: auto.name,
      publicReply: chosenPublicReply,
      dmBody: chosenDmBody,
      contactId: contact.id,
      leadId: lead.id,
      runId: run.id,
    };
  }

  return { matched: false };
}
