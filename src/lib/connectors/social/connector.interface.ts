import type { Platform } from "@/generated/prisma/enums";

/**
 * Thin platform-agnostic marker interface. Not consumed by any UI in
 * Phase 1 — it exists so future connectors (WhatsApp, Messenger, YouTube,
 * Telegram, Discord, TikTok, LinkedIn, X) follow the same shape as
 * lib/connectors/instagram: a `types.ts` DTO contract, a per-platform
 * implementation, and a factory keyed off PlatformConnection.mode. Each
 * platform's connector only exposes what its official API actually
 * supports — never fake unsupported functionality.
 */
export interface PlatformConnector {
  readonly platform: Platform;
  verifyConnection(accountId: string): Promise<{ ok: boolean; error?: string }>;
}
