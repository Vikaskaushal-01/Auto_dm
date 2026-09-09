import { db } from "@/lib/db";
import { getInstagramConnector } from "@/lib/connectors/instagram";
import type { Automation, AutomationTrigger, AutomationAction, Post } from "@/types/models";

export interface ProcessCommentInput {
  externalCommentId: string;
  text: string;
  commenterUsername: string;
  commenterId?: string;
  mediaExternalId: string;
  timestamp?: Date;
  socialAccountId?: string;
  isSimulation?: boolean;
}

export interface AutomationExecutionResult {
  matched: boolean;
  skipped?: boolean;
  reason?: string;
  automationId?: string;
  automationName?: string;
  commentId?: string;
  publicReplySent: boolean;
  publicReplyText?: string;
  dmSent: boolean;
  dmText?: string;
  automationRunId?: string;
  error?: string;
}

/**
 * Checks whether comment text matches the given trigger keyword configuration
 */
export function checkKeywordMatch(
  commentText: string,
  trigger: AutomationTrigger,
): boolean {
  if (!trigger.keywordGroup || trigger.keywordGroup.length === 0) {
    return false;
  }

  const rawComment = commentText || "";
  const normalizedComment = trigger.caseSensitive ? rawComment : rawComment.toLowerCase();

  // Normalize keywords list (split commas if entered as comma-separated strings)
  const keywords = trigger.keywordGroup
    .flatMap((kw) => kw.split(","))
    .map((kw) => (trigger.caseSensitive ? kw.trim() : kw.trim().toLowerCase()))
    .filter(Boolean);

  if (trigger.matchType === "ANY") {
    return true;
  }

  for (const kw of keywords) {
    if (!kw) continue;

    switch (trigger.matchType) {
      case "EXACT": {
        // Strip trailing punctuation like ! or .
        const strippedComment = normalizedComment.replace(/^[#@\s]+|[!?.,\s]+$/g, "").trim();
        if (strippedComment === kw) return true;
        break;
      }
      case "CONTAINS":
      default: {
        // Word boundary or substring check
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const wordRegex = new RegExp(`(^|\\s|[.,!#?])${escaped}($|\\s|[.,!#?])`, trigger.caseSensitive ? "" : "i");
        if (wordRegex.test(normalizedComment) || normalizedComment.includes(kw)) {
          return true;
        }
        break;
      }
    }
  }

  return false;
}

/**
 * Replaces personalization tokens in the DM body
 */
export async function renderDmBody(
  template: string,
  commenterUsername: string,
  linkId?: string | null,
): Promise<string> {
  let body = template || "";

  // Derive a friendly first name from the username (e.g. nittinbhagaaat -> Nittin)
  const cleanUser = commenterUsername.replace(/^@/, "");
  const firstName = cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1);

  body = body.replace(/\{\{\s*first_name\s*\}\}/gi, firstName);
  body = body.replace(/\{\{\s*username\s*\}\}/gi, `@${cleanUser}`);

  let resolvedLinkUrl = "";
  if (linkId) {
    const link = await db.link.findUnique({ where: { id: linkId } });
    if (link?.destinationUrl) {
      resolvedLinkUrl = link.destinationUrl;
    }
  }

  if (resolvedLinkUrl) {
    if (body.includes("{{link}}") || body.includes("{{ link }}")) {
      body = body.replace(/\{\{\s*link\s*\}\}/gi, resolvedLinkUrl);
    } else {
      // Append destination link if not explicitly in the template
      body = `${body.trim()}\n\n🔗 ${resolvedLinkUrl}`;
    }
  } else {
    body = body.replace(/\{\{\s*link\s*\}\}/gi, "");
  }

  return body.trim();
}

/**
 * Main Automation Engine: processes an incoming Instagram comment
 */
export async function processInstagramComment(
  input: ProcessCommentInput,
): Promise<AutomationExecutionResult> {
  const {
    externalCommentId,
    text,
    commenterUsername,
    mediaExternalId,
    timestamp = new Date(),
    isSimulation = false,
  } = input;

  console.log(`[AutoDM] Processing comment on media ${mediaExternalId} from @${commenterUsername}: "${text}"`);

  // 1. Resolve Post and SocialAccount
  let post = await db.post.findFirst({
    where: { externalId: mediaExternalId },
  });

  let socialAccountId = input.socialAccountId;
  if (post) {
    socialAccountId = post.socialAccountId;
  } else if (!socialAccountId) {
    const firstAccount = await db.socialAccount.findFirst({
      where: { platform: "INSTAGRAM" },
    });
    if (!firstAccount) {
      return { matched: false, skipped: true, reason: "NO_CONNECTED_ACCOUNT", publicReplySent: false, dmSent: false };
    }
    socialAccountId = firstAccount.id;
  }

  // Create post record if it doesn't exist yet
  if (!post) {
    post = await db.post.create({
      data: {
        socialAccountId,
        externalId: mediaExternalId,
        type: "REEL",
        caption: `Post ${mediaExternalId}`,
        publishedAt: timestamp,
      },
    });
  }

  // 2. Upsert Comment in DB
  let comment = await db.comment.findFirst({
    where: { postId: post.id, externalId: externalCommentId },
  });

  if (!comment) {
    comment = await db.comment.create({
      data: {
        postId: post.id,
        externalId: externalCommentId,
        authorUsername: commenterUsername,
        text,
        createdAtPlatform: timestamp,
        isFromAutomationReply: false,
      },
    });
  }

  // 3. Idempotency Check (ensure we don't reply twice to the same comment)
  if (!isSimulation) {
    const existingRun = await db.automationRun.findFirst({
      where: {
        commentId: comment.id,
        status: { in: ["DM_DELIVERED", "DM_SENT"] },
      },
    });

    if (existingRun) {
      console.log(`[AutoDM] Comment ${comment.id} has already been processed (Run: ${existingRun.id}). Skipping.`);
      return {
        matched: true,
        skipped: true,
        reason: "ALREADY_PROCESSED",
        automationRunId: existingRun.id,
        publicReplySent: false,
        dmSent: false,
      };
    }
  }

  // 4. Fetch all ACTIVE automations for this account
  const automations = await db.automation.findMany({
    where: {
      socialAccountId,
      status: "ACTIVE",
    },
    include: {
      triggers: true,
      targetPosts: true,
      actions: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (automations.length === 0) {
    console.log(`[AutoDM] No active automations found for account ${socialAccountId}.`);
    return { matched: false, skipped: true, reason: "NO_ACTIVE_AUTOMATIONS", publicReplySent: false, dmSent: false };
  }

  // 5. Find matching automation
  let matchedAutomation: (Automation & {
    triggers: AutomationTrigger[];
    targetPosts: { postId: string }[];
    actions: AutomationAction[];
  }) | null = null;

  for (const auto of automations) {
    // Check target scope
    if (auto.scope === "SPECIFIC_POSTS") {
      const isTargeted = auto.targetPosts.some((tp) => tp.postId === post.id);
      if (!isTargeted) continue;
    }

    // Check triggers
    for (const trigger of auto.triggers) {
      if (checkKeywordMatch(text, trigger)) {
        matchedAutomation = auto as any;
        break;
      }
    }

    if (matchedAutomation) break;
  }

  if (!matchedAutomation) {
    console.log(`[AutoDM] Comment "${text}" did not match any active automation triggers.`);
    return { matched: false, reason: "KEYWORD_NOT_MATCHED", publicReplySent: false, dmSent: false };
  }

  console.log(`[AutoDM] Matched automation "${matchedAutomation.name}" (ID: ${matchedAutomation.id})`);

  // 6. Execute Actions
  const connector = await getInstagramConnector(socialAccountId);
  let publicReplySent = false;
  let publicReplyText: string | undefined;
  let dmSent = false;
  let dmText: string | undefined;
  let automationRunId: string | undefined;
  let executionError: string | undefined;

  // Execute Public Reply
  const replyAction = matchedAutomation.actions.find((a) => a.type === "PUBLIC_REPLY");
  if (replyAction && replyAction.publicReplyVariations.length > 0) {
    const variations = replyAction.publicReplyVariations.filter(Boolean);
    const chosenReply = variations[Math.floor(Math.random() * variations.length)] || "Check your DMs! 📩";
    publicReplyText = chosenReply;

    if (!isSimulation && externalCommentId && !externalCommentId.startsWith("sim_")) {
      try {
        await connector.replyToComment(comment.id, chosenReply);
        publicReplySent = true;
      } catch (err: any) {
        console.error("[AutoDM] Public reply failed:", err?.message || err);
      }
    } else {
      publicReplySent = true; // simulated success
    }
  }

  // Execute Send DM
  const dmAction = matchedAutomation.actions.find((a) => a.type === "SEND_DM");
  if (dmAction) {
    dmText = await renderDmBody(dmAction.dmBody || "", commenterUsername, dmAction.linkId);

    try {
      const result = await connector.sendDirectMessage({
        accountId: socialAccountId,
        automationId: matchedAutomation.id,
        commentId: comment.id,
        toUsername: commenterUsername,
        body: dmText,
        linkId: dmAction.linkId || undefined,
      });

      automationRunId = result.automationRunId;
      dmSent = result.status === "DM_SENT" || isSimulation;
    } catch (err: any) {
      console.error("[AutoDM] Send DM failed:", err?.message || err);
      executionError = err?.message || "Failed to send direct message via Instagram API";
    }
  }

  // Update comment status in DB
  await db.comment.update({
    where: { id: comment.id },
    data: {
      matchedAutomationId: matchedAutomation.id,
      isFromAutomationReply: publicReplySent,
    },
  });

  return {
    matched: true,
    automationId: matchedAutomation.id,
    automationName: matchedAutomation.name,
    commentId: comment.id,
    publicReplySent,
    publicReplyText,
    dmSent,
    dmText,
    automationRunId,
    error: executionError,
  };
}
