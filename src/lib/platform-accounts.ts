import { db } from "@/lib/db";

export const SUPPORTED_PLATFORMS = ["INSTAGRAM", "FACEBOOK", "WHATSAPP"] as const;
export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

// Facebook Pages/Messenger are modeled under Platform.MESSENGER in the DB
// (matching Meta's own product naming) — this maps the picker's "FACEBOOK"
// label to the underlying enum value.
export function platformToDbEnum(platform: SupportedPlatform): "INSTAGRAM" | "MESSENGER" | "WHATSAPP" {
  return platform === "FACEBOOK" ? "MESSENGER" : platform;
}

export const PLATFORM_LABELS: Record<SupportedPlatform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
};

export async function getConnectedAccounts(workspaceId: string) {
  const accounts = await db.socialAccount.findMany({
    where: { workspaceId, platform: { in: ["INSTAGRAM", "MESSENGER", "WHATSAPP"] } },
    include: { connection: true },
    orderBy: { createdAt: "asc" },
  });
  return accounts;
}
