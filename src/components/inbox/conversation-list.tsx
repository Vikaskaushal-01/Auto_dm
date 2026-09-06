import Link from "next/link";
import { Camera, ThumbsUp, MessageCircle, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const PLATFORM_ICON = { INSTAGRAM: Camera, MESSENGER: ThumbsUp, WHATSAPP: MessageCircle } as const;
const PLATFORM_COLOR = { INSTAGRAM: "text-pink-400", MESSENGER: "text-blue-400", WHATSAPP: "text-emerald-400" } as const;

export interface ConversationListItemData {
  id: string;
  platform: "INSTAGRAM" | "MESSENGER" | "WHATSAPP";
  status: string;
  botPaused: boolean;
  lastMessageAt: Date;
  contactName: string;
  lastMessagePreview: string;
}

export function ConversationList({
  conversations,
  activeId,
  filterQuery,
}: {
  conversations: ConversationListItemData[];
  activeId?: string;
  filterQuery: string;
}) {
  if (conversations.length === 0) {
    return <p className="p-4 text-sm text-neutral-500">No conversations match this filter.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-800">
      {conversations.map((c) => {
        const Icon = PLATFORM_ICON[c.platform];
        const isActive = c.id === activeId;
        return (
          <li key={c.id}>
            <Link
              href={`/inbox?${filterQuery}conversation=${c.id}`}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-neutral-800/60",
                isActive && "bg-violet-600/10",
              )}
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-800">
                <Icon className={cn("h-4 w-4", PLATFORM_COLOR[c.platform])} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-neutral-200">{c.contactName}</p>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {formatDistanceToNow(c.lastMessageAt, { addSuffix: true })}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {c.botPaused && <Bot className="h-3 w-3 shrink-0 text-amber-400" aria-label="Bot paused" />}
                  <p className="truncate text-xs text-neutral-500">{c.lastMessagePreview}</p>
                </div>
              </div>
              {c.status === "PENDING" && (
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-label="Pending" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
