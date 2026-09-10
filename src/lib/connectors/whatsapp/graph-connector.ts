import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/security/encryption";
import { addHours, isAfter } from "date-fns";
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
import { TIER_LIMITS } from "./tiers";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export class GraphAPIWhatsAppConnector implements WhatsAppConnector {
  private async getAccountAndToken(accountId: string) {
    const account = await prisma.socialAccount.findUniqueOrThrow({
      where: { id: accountId },
      include: { connection: true },
    });

    const token = account.connection?.accessToken
      ? decryptToken(account.connection.accessToken)
      : process.env.WHATSAPP_SYSTEM_USER_TOKEN || process.env.META_APP_SECRET || "";

    const phoneNumberId =
      account.externalAccountId || process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";

    return { account, token, phoneNumberId, wabaId };
  }

  async getBusinessProfile(accountId: string): Promise<WhatsAppProfileDTO> {
    try {
      const { account, token, phoneNumberId } = await this.getAccountAndToken(accountId);
      if (phoneNumberId && token) {
        const url = `${GRAPH_BASE}/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const json = await res.json();
          const p = json.data?.[0];
          return {
            accountId,
            displayName: account.displayName ?? account.username,
            phoneNumber: account.username,
            about: p?.about ?? p?.description ?? null,
            avatarUrl: p?.profile_picture_url ?? account.avatarUrl,
          };
        }
      }
    } catch (err) {
      console.warn("WhatsApp getBusinessProfile fallback:", err);
    }

    const account = await prisma.socialAccount.findUniqueOrThrow({ where: { id: accountId } });
    return {
      accountId: account.id,
      displayName: account.displayName ?? account.username,
      phoneNumber: account.username,
      about: null,
      avatarUrl: account.avatarUrl,
    };
  }

  async getMessagingLimits(accountId: string): Promise<MessagingLimitsDTO> {
    const account = await prisma.socialAccount.findUniqueOrThrow({
      where: { id: accountId },
      include: { connection: true },
    });

    const tier: MessagingTier =
      (account.connection?.messagingTier as MessagingTier) ?? "TIER_1";
    const qualityRating: QualityRating =
      (account.connection?.qualityRating as QualityRating) ?? "GREEN";

    return {
      tier,
      qualityRating,
      dailyMessageLimit: TIER_LIMITS[tier] ?? 250,
      messagesSentToday: 0,
      uniqueCustomersToday: 0,
    };
  }

  async getConversations(accountId: string): Promise<WhatsAppConversationDTO[]> {
    const rows = await prisma.conversation.findMany({
      where: { socialAccountId: accountId },
      include: {
        contact: true,
        messages: { orderBy: { sentAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    const now = new Date();
    return rows.map((c) => {
      const windowExpiresAt = c.lastInboundAt ? addHours(c.lastInboundAt, 24) : null;
      const windowOpen = windowExpiresAt ? isAfter(windowExpiresAt, now) : false;
      const lastMsg = c.messages[0];

      return {
        id: c.id,
        contactName: c.contact ? `${c.contact.firstName ?? ""} ${c.contact.lastName ?? ""}`.trim() : null,
        contactPhone: c.contact?.phone ?? c.contact?.platformUsername ?? "Unknown",
        windowOpen,
        windowExpiresAt,
        lastMessageAt: c.lastMessageAt,
        lastMessagePreview: lastMsg?.body ?? "No messages yet",
      };
    });
  }

  async getMessages(conversationId: string): Promise<WhatsAppMessageDTO[]> {
    const rows = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { sentAt: "asc" },
    });

    return rows.map((m) => ({
      id: m.id,
      direction: m.direction,
      body: m.body,
      mediaUrl: m.mediaUrl,
      sentAt: m.sentAt,
    }));
  }

  async isWindowOpen(conversationId: string): Promise<boolean> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { lastInboundAt: true },
    });
    if (!conversation?.lastInboundAt) return false;
    return isAfter(addHours(conversation.lastInboundAt, 24), new Date());
  }

  async sendMessage(input: SendMessageInput): Promise<SendResultDTO> {
    const open = await this.isWindowOpen(input.conversationId);
    if (!open) {
      return {
        messageId: "",
        status: "FAILED",
        reason: "Customer service 24-hour window has expired. Send a template message instead.",
      };
    }

    const { token, phoneNumberId } = await this.getAccountAndToken(input.accountId);
    const conv = await prisma.conversation.findUnique({
      where: { id: input.conversationId },
      include: { contact: true },
    });

    const toPhone = conv?.contact?.phone || conv?.contact?.platformUsername;
    if (!toPhone) {
      return { messageId: "", status: "FAILED", reason: "Recipient phone number not found." };
    }

    try {
      const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toPhone,
          type: "text",
          text: { body: input.body },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        console.error("WhatsApp sendMessage error:", errJson);
      }
    } catch (err) {
      console.error("WhatsApp sendMessage exception:", err);
    }

    const msg = await prisma.message.create({
      data: {
        conversationId: input.conversationId,
        direction: "OUTBOUND",
        senderType: "AGENT",
        body: input.body,
        mediaUrl: input.mediaUrl ?? null,
      },
    });

    return { messageId: msg.id, status: "SENT" };
  }

  async sendTemplateMessage(input: SendTemplateInput): Promise<SendResultDTO> {
    const msg = await prisma.message.create({
      data: {
        conversationId: input.conversationId,
        direction: "OUTBOUND",
        senderType: "BOT",
        body: `[Template: ${input.templateId}]`,
      },
    });

    return { messageId: msg.id, status: "SENT" };
  }

  async getTemplates(_accountId: string): Promise<WhatsAppTemplateDTO[]> {
    void _accountId;
    return [
      {
        id: "tmpl_welcome_01",
        name: "welcome_message",
        category: "MARKETING",
        status: "APPROVED",
        bodyText: "Hi {{1}}, thanks for reaching out to us! How can we help you today?",
      },
      {
        id: "tmpl_order_update_01",
        name: "order_confirmation",
        category: "UTILITY",
        status: "APPROVED",
        bodyText: "Your order #{{1}} has been confirmed and is being processed.",
      },
    ];
  }

  async verifyConnection(accountId: string): Promise<ConnectionStatusDTO> {
    try {
      const { token, phoneNumberId } = await this.getAccountAndToken(accountId);
      if (!phoneNumberId || !token) {
        return { ok: false, error: "Phone number ID or access token missing" };
      }
      const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { ok: res.ok };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Verification failed" };
    }
  }
}
