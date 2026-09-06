/**
 * WhatsApp is messaging-only — no posts, reels, or followers. Its defining
 * constraints (unlike Instagram) are:
 *   - A 24-hour customer-service window: free-form replies are only allowed
 *     within 24h of the customer's last inbound message. Outside it, only
 *     pre-approved template messages can be sent.
 *   - Tiered daily unique-customer messaging limits (250 -> 1,000 -> 10,000
 *     -> 100,000+) that scale with the account's quality rating.
 * These shape the interface below — it is deliberately NOT a copy of
 * InstagramConnector.
 */

export type MessagingTier = "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4" | "UNLIMITED";
export type QualityRating = "GREEN" | "YELLOW" | "RED";
export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED";

export interface WhatsAppProfileDTO {
  accountId: string;
  displayName: string;
  phoneNumber: string;
  about: string | null;
  avatarUrl: string | null;
}

export interface MessagingLimitsDTO {
  tier: MessagingTier;
  qualityRating: QualityRating;
  dailyMessageLimit: number;
  messagesSentToday: number;
  uniqueCustomersToday: number;
}

export interface WhatsAppConversationDTO {
  id: string;
  contactName: string | null;
  contactPhone: string;
  windowOpen: boolean;
  windowExpiresAt: Date | null;
  lastMessageAt: Date;
  lastMessagePreview: string;
}

export interface WhatsAppMessageDTO {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  body: string;
  mediaUrl: string | null;
  sentAt: Date;
}

export interface WhatsAppTemplateDTO {
  id: string;
  name: string;
  category: TemplateCategory;
  status: TemplateStatus;
  bodyText: string;
}

export interface SendMessageInput {
  accountId: string;
  conversationId: string;
  body: string;
  mediaUrl?: string;
}

export interface SendTemplateInput {
  accountId: string;
  conversationId: string;
  templateId: string;
  variables?: Record<string, string>;
}

export interface SendResultDTO {
  messageId: string;
  status: "SENT" | "FAILED";
  reason?: string;
}

export interface ConnectionStatusDTO {
  ok: boolean;
  error?: string;
}

export interface WhatsAppConnector {
  getBusinessProfile(accountId: string): Promise<WhatsAppProfileDTO>;
  getMessagingLimits(accountId: string): Promise<MessagingLimitsDTO>;
  getConversations(accountId: string): Promise<WhatsAppConversationDTO[]>;
  getMessages(conversationId: string): Promise<WhatsAppMessageDTO[]>;
  isWindowOpen(conversationId: string): Promise<boolean>;
  /** Free-form message — only succeeds if the 24h window is currently open. */
  sendMessage(input: SendMessageInput): Promise<SendResultDTO>;
  /** Works regardless of window state — the only way to reach a customer outside it. */
  sendTemplateMessage(input: SendTemplateInput): Promise<SendResultDTO>;
  getTemplates(accountId: string): Promise<WhatsAppTemplateDTO[]>;
  verifyConnection(accountId: string): Promise<ConnectionStatusDTO>;
}
