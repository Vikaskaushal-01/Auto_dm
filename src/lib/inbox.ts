import { prisma } from "@/lib/prisma";

export interface ConversationFilters {
  platform?: "INSTAGRAM" | "MESSENGER" | "WHATSAPP";
  status?: "OPEN" | "PENDING" | "CLOSED";
}

// The list pane has no pagination UI yet, so cap what a single load can pull
// back — without this, a growing workspace turns "open the inbox" into an
// unbounded fetch of every conversation (each with a joined last-message)
// ever created. 100 most-recent-first covers the practical case; add cursor
// pagination here if the list needs to go deeper than that.
const CONVERSATION_LIST_LIMIT = 100;

export async function getConversations(workspaceId: string, filters: ConversationFilters = {}) {
  return prisma.conversation.findMany({
    where: {
      workspaceId,
      platform: filters.platform,
      status: filters.status,
    },
    include: {
      contact: { select: { firstName: true, lastName: true, platformUsername: true, phone: true } },
      socialAccount: { select: { username: true, platform: true } },
      assignedTo: { select: { name: true, email: true } },
      messages: { orderBy: { sentAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
    take: CONVERSATION_LIST_LIMIT,
  });
}

export async function getConversationDetail(conversationId: string, workspaceId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    include: {
      contact: true,
      socialAccount: { select: { id: true, username: true, platform: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { sentAt: "asc" } },
    },
  });
  return conversation;
}

const WINDOW_HOURS = 24;

export function isWindowOpen(lastInboundAt: Date | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - lastInboundAt.getTime() < WINDOW_HOURS * 60 * 60 * 1000;
}
