import type {
  ConnectionStatusDTO,
  MessagingLimitsDTO,
  SendMessageInput,
  SendResultDTO,
  SendTemplateInput,
  WhatsAppConnector,
  WhatsAppConversationDTO,
  WhatsAppMessageDTO,
  WhatsAppProfileDTO,
  WhatsAppTemplateDTO,
} from "./types";

/**
 * Real WhatsApp Business Platform (Cloud API) implementation — NOT wired up
 * yet. Requires a Meta Business App with WhatsApp product added, a
 * registered phone number, and completed Business Verification.
 *
 * Endpoint mapping for when this gets implemented:
 *   getBusinessProfile  -> GET /{phone-number-id}/whatsapp_business_profile
 *   getMessagingLimits  -> GET /{waba-id} (messaging_limit_tier, quality_rating fields)
 *   getConversations    -> derived from webhook-received messages (WhatsApp has no
 *                          "list conversations" endpoint — conversations are built
 *                          from the inbound webhook stream, stored locally)
 *   getMessages         -> local store (see above); WhatsApp does not expose message history via API
 *   sendMessage          -> POST /{phone-number-id}/messages (type: text)
 *   sendTemplateMessage  -> POST /{phone-number-id}/messages (type: template)
 *   getTemplates         -> GET /{waba-id}/message_templates
 */
export class GraphAPIWhatsAppConnector implements WhatsAppConnector {
  private notImplemented(method: string): never {
    throw new Error(
      `GraphAPIWhatsAppConnector.${method}() is not implemented yet. ` +
        "Connect a real WhatsApp Business account via Meta OAuth (Settings > Integrations) " +
        "once META_APP_ID/META_APP_SECRET are configured and the number is registered.",
    );
  }

  getBusinessProfile(_accountId: string): Promise<WhatsAppProfileDTO> {
    this.notImplemented("getBusinessProfile");
  }
  getMessagingLimits(_accountId: string): Promise<MessagingLimitsDTO> {
    this.notImplemented("getMessagingLimits");
  }
  getConversations(_accountId: string): Promise<WhatsAppConversationDTO[]> {
    this.notImplemented("getConversations");
  }
  getMessages(_conversationId: string): Promise<WhatsAppMessageDTO[]> {
    this.notImplemented("getMessages");
  }
  isWindowOpen(_conversationId: string): Promise<boolean> {
    this.notImplemented("isWindowOpen");
  }
  sendMessage(_input: SendMessageInput): Promise<SendResultDTO> {
    this.notImplemented("sendMessage");
  }
  sendTemplateMessage(_input: SendTemplateInput): Promise<SendResultDTO> {
    this.notImplemented("sendTemplateMessage");
  }
  getTemplates(_accountId: string): Promise<WhatsAppTemplateDTO[]> {
    this.notImplemented("getTemplates");
  }
  verifyConnection(_accountId: string): Promise<ConnectionStatusDTO> {
    this.notImplemented("verifyConnection");
  }
}
