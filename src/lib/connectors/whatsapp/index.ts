import { db } from "@/lib/db";
import { DemoWhatsAppConnector } from "./demo-connector";
import { GraphAPIWhatsAppConnector } from "./graph-connector";
import type { WhatsAppConnector } from "./types";

const demoConnector = new DemoWhatsAppConnector();
const graphConnector = new GraphAPIWhatsAppConnector();

export async function getWhatsAppConnector(socialAccountId: string): Promise<WhatsAppConnector> {
  const connection = await db.platformConnection.findUnique({
    where: { socialAccountId },
    select: { mode: true },
  });
  return connection?.mode === "LIVE" ? graphConnector : demoConnector;
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
