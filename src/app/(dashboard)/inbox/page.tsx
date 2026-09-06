import Link from "next/link";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getConversations, getConversationDetail, isWindowOpen } from "@/lib/inbox";
import { ConversationList, type ConversationListItemData } from "@/components/inbox/conversation-list";
import { MessageThread } from "@/components/inbox/message-thread";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

const PLATFORM_FILTERS = [
  { key: undefined, label: "All" },
  { key: "INSTAGRAM", label: "Instagram" },
  { key: "MESSENGER", label: "Facebook" },
  { key: "WHATSAPP", label: "WhatsApp" },
] as const;

const STATUS_FILTERS = [
  { key: undefined, label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "PENDING", label: "Pending" },
  { key: "CLOSED", label: "Closed" },
] as const;

function contactDisplayName(contact: { firstName: string | null; lastName: string | null; platformUsername: string | null; phone: string | null } | null) {
  if (!contact) return "Unknown";
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return name || contact.platformUsername || contact.phone || "Unknown";
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; status?: string; conversation?: string }>;
}) {
  const { platform, status, conversation: activeConversationId } = await searchParams;
  const { workspaceId } = await getCurrentWorkspaceContext();

  const filters = {
    platform: platform as "INSTAGRAM" | "MESSENGER" | "WHATSAPP" | undefined,
    status: status as "OPEN" | "PENDING" | "CLOSED" | undefined,
  };

  const conversations = await getConversations(workspaceId, filters);
  const listItems: ConversationListItemData[] = conversations.map((c) => ({
    id: c.id,
    platform: c.platform as "INSTAGRAM" | "MESSENGER" | "WHATSAPP",
    status: c.status,
    botPaused: c.botPaused,
    lastMessageAt: c.lastMessageAt,
    contactName: contactDisplayName(c.contact),
    lastMessagePreview: c.messages[0]?.body ?? "No messages yet",
  }));

  const selectedId = activeConversationId ?? conversations[0]?.id;
  const detail = selectedId ? await getConversationDetail(selectedId, workspaceId) : null;

  const filterQueryParts: string[] = [];
  if (platform) filterQueryParts.push(`platform=${platform}&`);
  if (status) filterQueryParts.push(`status=${status}&`);
  const filterQuery = filterQueryParts.join("");

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-white">Inbox</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Every conversation across Instagram, Facebook, and WhatsApp in one place.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4">
        <div className="flex gap-1.5">
          {PLATFORM_FILTERS.map((f) => (
            <Link
              key={f.label}
              href={`/inbox?${f.key ? `platform=${f.key}&` : ""}${status ? `status=${status}&` : ""}`}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                platform === f.key || (!platform && !f.key)
                  ? "bg-violet-600 text-white"
                  : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.label}
              href={`/inbox?${platform ? `platform=${platform}&` : ""}${f.key ? `status=${f.key}&` : ""}`}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                status === f.key || (!status && !f.key)
                  ? "bg-neutral-700 text-white"
                  : "bg-neutral-900 text-neutral-500 hover:bg-neutral-800",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60">
        <div className="w-full max-w-xs shrink-0 overflow-y-auto border-r border-neutral-800">
          <ConversationList conversations={listItems} activeId={selectedId} filterQuery={filterQuery} />
        </div>
        <div className="hidden flex-1 md:block">
          {detail ? (
            <MessageThread
              conversationId={detail.id}
              contactName={contactDisplayName(detail.contact)}
              platform={detail.platform as "INSTAGRAM" | "MESSENGER" | "WHATSAPP"}
              status={detail.status}
              botPaused={detail.botPaused}
              windowOpen={detail.platform === "WHATSAPP" ? isWindowOpen(detail.lastInboundAt) : null}
              assignedToName={detail.assignedTo?.name ?? detail.assignedTo?.email ?? null}
              messages={detail.messages}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-neutral-500">
              <MessageSquare className="h-8 w-8" aria-hidden />
              <p className="mt-2 text-sm">Select a conversation to view it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
