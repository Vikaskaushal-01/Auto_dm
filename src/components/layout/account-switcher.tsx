import Link from "next/link";
import { Camera, ThumbsUp, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConnectedAccountSummary {
  platform: "INSTAGRAM" | "MESSENGER" | "WHATSAPP";
  username: string;
}

const PLATFORM_META = {
  INSTAGRAM: { label: "Instagram", Icon: Camera, color: "text-pink-400" },
  MESSENGER: { label: "Facebook", Icon: ThumbsUp, color: "text-blue-400" },
  WHATSAPP: { label: "WhatsApp", Icon: MessageCircle, color: "text-emerald-400" },
} as const;

export function AccountSwitcher({ accounts }: { accounts: ConnectedAccountSummary[] }) {
  if (accounts.length === 0) return null;

  return (
    <div className="hidden items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/60 p-1 lg:flex">
      {(["INSTAGRAM", "MESSENGER", "WHATSAPP"] as const).map((platform) => {
        const account = accounts.find((a) => a.platform === platform);
        const meta = PLATFORM_META[platform];
        const connected = !!account;
        const isPrimary = platform === "INSTAGRAM";

        const content = (
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
              connected ? "text-neutral-200" : "text-neutral-600",
              isPrimary && connected && "bg-violet-600/15 text-violet-300",
            )}
            title={connected ? `${meta.label}: ${account.username}` : `${meta.label}: not connected`}
          >
            <meta.Icon className={cn("h-3.5 w-3.5", connected && meta.color)} aria-hidden />
            <span className="hidden xl:inline">{meta.label}</span>
          </span>
        );

        return (
          <Link key={platform} href="/settings/integrations">
            {content}
          </Link>
        );
      })}
    </div>
  );
}
