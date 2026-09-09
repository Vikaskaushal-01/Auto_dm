import { db } from "@/lib/db";
import { TIER_LIMITS } from "./tiers";
import type {
  ConnectionStatusDTO,
  MessagingLimitsDTO,
  MessagingTier,
  QualityRating,
  SendMessageInput,
  SendResultDTO,
  SendTemplateInput,
  WhatsAppConnector,
  WhatsAppConversationDTO,
  WhatsAppMessageDTO,
  WhatsAppProfileDTO,
  WhatsAppTemplateDTO,
} from "./types";

const WINDOW_HOURS = 24;

const DEMO_TEMPLATES: WhatsAppTemplateDTO[] = [
  {
    id: "tmpl_welcome",
    name: "welcome_message",
    category: "UTILITY",
    status: "APPROVED",
    bodyText: "Hi {{1}}! Thanks for reaching out to {{2}}. How can we help today?",
  },
  {
    id: "tmpl_roadmap_reminder",
    name: "roadmap_reminder",
    category: "MARKETING",
    status: "APPROVED",
    bodyText: "Hey {{1}}, still want that free AI roadmap? Reply YES and we'll send it right over.",
  },
  {
    id: "tmpl_order_update",
    name: "order_update",
    category: "UTILITY",
    status: "PENDING",
    bodyText: "Your order {{1}} status has been updated to {{2}}.",
  },
];

export class DemoWhatsAppConnector implements WhatsAppConnector {
  async getBusinessProfile(accountId: string): Promise<WhatsAppProfileDTO> {
    const account = await db.socialAccount.findUniqueOrThrow({
      where: { id: accountId },
      include: { profile: true },
    });
    return {
      accountId: account.id,
      displayName: account.displayName ?? account.username,
      phoneNumber: account.username,
      about: account.profile?.bio ?? null,
      avatarUrl: account.avatarUrl,
    };
  }

  async getMessagingLimits(accountId: string): Promise<MessagingLimitsDTO> {
    const connection = await db.platformConnection.findUnique({
      where: { socialAccountId: accountId },
    });
    const tier = (connection?.messagingTier ?? "TIER_1") as MessagingTier;
    const qualityRating = (connection?.qualityRating ?? "GREEN") as QualityRating;
    const dailyMessageLimit = connection?.dailyMessageLimit ?? TIER_LIMITS[tier];

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [messagesSentToday, uniqueCustomersToday] = await Promise.all([
      db.message.count({
        where: {
          direction: "OUTBOUND",
          sentAt: { gte: since24h },
          conversation: { socialAccountId: accountId },
        },
      }),
      db.conversation
        .findMany({
          where: { socialAccountId: accountId, lastMessageAt: { gte: since24h } },
          select: { id: true },
        })
        .then((rows) => rows.length),
    ]);

    return { tier, qualityRating, dailyMessageLimit, messagesSentToday, uniqueCustomersToday };
  }

  async getConversations(accountId: string): Promise<WhatsAppConversationDTO[]> {
    const conversations = await db.conversation.findMany({
      where: { socialAccountId: accountId },
      include: {
        contact: { select: { firstName: true, lastName: true, phone: true, platformUsername: true } },
        messages: { orderBy: { sentAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    return conversations.map((c) => {
      const windowExpiresAt = c.lastInboundAt
        ? new Date(c.lastInboundAt.getTime() + WINDOW_HOURS * 60 * 60 * 1000)
        : null;
      return {
        id: c.id,
        contactName: c.contact
          ? [c.contact.firstName, c.contact.lastName].filter(Boolean).join(" ") || null
          : null,
        contactPhone: c.contact?.phone ?? c.contact?.platformUsername ?? "unknown",
        windowOpen: windowExpiresAt !== null && windowExpiresAt.getTime() > Date.now(),
        windowExpiresAt,
        lastMessageAt: c.lastMessageAt,
        lastMessagePreview: c.messages[0]?.body ?? "",
      };
    });
  }

  async getMessages(conversationId: string): Promise<WhatsAppMessageDTO[]> {
    const messages = await db.message.findMany({
      where: { conversationId },
      orderBy: { sentAt: "asc" },
    });
    return messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      body: m.body,
      mediaUrl: m.mediaUrl,
      sentAt: m.sentAt,
    }));
  }

  async isWindowOpen(conversationId: string): Promise<boolean> {
    const conversation = await db.conversation.findUniqueOrThrow({
      where: { id: conversationId },
    });
    if (!conversation.lastInboundAt) return false;
    return Date.now() - conversation.lastInboundAt.getTime() < WINDOW_HOURS * 60 * 60 * 1000;
  }

  async sendMessage(input: SendMessageInput): Promise<SendResultDTO> {
    const windowOpen = await this.isWindowOpen(input.conversationId);
    if (!windowOpen) {
      return {
        messageId: "",
        status: "FAILED",
        reason:
          "24-hour window closed — this contact hasn't messaged in the last 24h. Send a template message instead.",
      };
    }
    const message = await db.message.create({
      data: {
        conversationId: input.conversationId,
        direction: "OUTBOUND",
        senderType: "BOT",
        body: input.body,
        mediaUrl: input.mediaUrl,
      },
    });
    await db.conversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: message.sentAt },
    });
    return { messageId: message.id, status: "SENT" };
  }

  async sendTemplateMessage(input: SendTemplateInput): Promise<SendResultDTO> {
    const template = DEMO_TEMPLATES.find((t) => t.id === input.templateId);
    if (!template) {
      return { messageId: "", status: "FAILED", reason: "Template not found." };
    }
    if (template.status !== "APPROVED") {
      return { messageId: "", status: "FAILED", reason: `Template is ${template.status.toLowerCase()}, not approved yet.` };
    }
    let body = template.bodyText;
    for (const [key, value] of Object.entries(input.variables ?? {})) {
      body = body.replace(`{{${key}}}`, value);
    }
    const message = await db.message.create({
      data: {
        conversationId: input.conversationId,
        direction: "OUTBOUND",
        senderType: "BOT",
        body,
      },
    });
    await db.conversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: message.sentAt },
    });
    return { messageId: message.id, status: "SENT" };
  }

  async getTemplates(_accountId: string): Promise<WhatsAppTemplateDTO[]> {
    return DEMO_TEMPLATES;
  }

  async verifyConnection(accountId: string): Promise<ConnectionStatusDTO> {
    const connection = await db.platformConnection.findUnique({
      where: { socialAccountId: accountId },
    });
    if (!connection) return { ok: false, error: "No platform connection found" };
    return { ok: true };
  }
}
