import { GraphAPIWhatsAppConnector } from "./graph-connector";
import type { WhatsAppConnector } from "./types";

const graphConnector = new GraphAPIWhatsAppConnector();

/**
 * Single factory for the WhatsApp connector. Routes to the real Meta WhatsApp Cloud API connector.
 */
export async function getWhatsAppConnector(_socialAccountId?: string): Promise<WhatsAppConnector> {
  return graphConnector;
}

export type {
  WhatsAppConnector,
  WhatsAppProfileDTO,
  MessagingLimitsDTO,
  MessagingTier,
  QualityRating,
  WhatsAppConversationDTO,
  WhatsAppMessageDTO,
  WhatsAppTemplateDTO,
  SendMessageInput,
  SendTemplateInput,
  SendResultDTO,
  ConnectionStatusDTO,
} from "./types";
export { TIER_LIMITS, TIER_LABELS } from "./tiers";
