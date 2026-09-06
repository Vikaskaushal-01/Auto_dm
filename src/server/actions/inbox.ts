"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getWhatsAppConnector } from "@/lib/connectors/whatsapp";

export async function sendReplyAction(
  conversationId: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Message can't be empty." };

  const { workspaceId } = await getCurrentWorkspaceContext();
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
  });
  if (!conversation) return { ok: false, error: "Conversation not found." };

  if (conversation.platform === "WHATSAPP") {
    const connector = await getWhatsAppConnector(conversation.socialAccountId);
    const result = await connector.sendMessage({
      accountId: conversation.socialAccountId,
      conversationId,
      body: trimmed,
    });
    if (result.status === "FAILED") {
      return { ok: false, error: result.reason ?? "Failed to send message." };
    }
  } else {
    const sentAt = new Date();
    await prisma.message.create({
      data: { conversationId, direction: "OUTBOUND", senderType: "AGENT", body: trimmed, sentAt },
    });
    await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: sentAt } });
  }

  revalidatePath("/inbox");
  return { ok: true };
}

export async function toggleBotPauseAction(conversationId: string): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
  });
  if (!conversation) return;
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { botPaused: !conversation.botPaused },
  });
  revalidatePath("/inbox");
}

export async function updateConversationStatusAction(
  conversationId: string,
  status: "OPEN" | "PENDING" | "CLOSED",
): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  await prisma.conversation.updateMany({
    where: { id: conversationId, workspaceId },
    data: { status },
  });
  revalidatePath("/inbox");
}

export async function assignToMeAction(conversationId: string): Promise<void> {
  const { workspaceId, userId } = await getCurrentWorkspaceContext();
  await prisma.conversation.updateMany({
    where: { id: conversationId, workspaceId },
    data: { assignedToUserId: userId },
  });
  revalidatePath("/inbox");
}

export async function unassignAction(conversationId: string): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  await prisma.conversation.updateMany({
    where: { id: conversationId, workspaceId },
    data: { assignedToUserId: null },
  });
  revalidatePath("/inbox");
}
