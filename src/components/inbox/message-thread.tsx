"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, BotOff, UserCheck, UserX, AlertTriangle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  sendReplyAction,
  toggleBotPauseAction,
  updateConversationStatusAction,
  assignToMeAction,
  unassignAction,
} from "@/server/actions/inbox";

export interface MessageData {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  senderType: "CONTACT" | "BOT" | "AGENT";
  body: string;
  sentAt: Date;
}

export function MessageThread({
  conversationId,
  contactName,
  platform,
  status,
  botPaused,
  windowOpen,
  assignedToName,
  messages,
}: {
  conversationId: string;
  contactName: string;
  platform: "INSTAGRAM" | "MESSENGER" | "WHATSAPP";
  status: string;
  botPaused: boolean;
  windowOpen: boolean | null; // null = not applicable (non-WhatsApp)
  assignedToName: string | null;
  messages: MessageData[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function send() {
    if (!draft.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await sendReplyAction(conversationId, draft);
      if (!result.ok) {
        setError(result.error ?? "Failed to send.");
        return;
      }
      setDraft("");
      router.refresh();
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">{contactName}</p>
          <p className="text-xs text-neutral-500">
            {assignedToName ? `Assigned to ${assignedToName}` : "Unassigned"}
            {status === "PENDING" && " · Pending"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => startTransition(async () => { await toggleBotPauseAction(conversationId); router.refresh(); })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
              botPaused
                ? "border-amber-600/40 bg-amber-500/10 text-amber-300"
                : "border-neutral-700 text-neutral-300 hover:bg-neutral-800",
            )}
          >
            {botPaused ? <BotOff className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            {botPaused ? "Bot paused" : "Bot active"}
          </button>
          {assignedToName ? (
            <button
              type="button"
              onClick={() => startTransition(async () => { await unassignAction(conversationId); router.refresh(); })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
            >
              <UserX className="h-3.5 w-3.5" />
              Unassign
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startTransition(async () => { await assignToMeAction(conversationId); router.refresh(); })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Assign to me
            </button>
          )}
          <select
            value={status}
            onChange={(e) =>
              startTransition(async () => {
                await updateConversationStatusAction(
                  conversationId,
                  e.target.value as "OPEN" | "PENDING" | "CLOSED",
                );
                router.refresh();
              })
            }
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-300"
          >
            <option value="OPEN">Open</option>
            <option value="PENDING">Pending</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {platform === "WHATSAPP" && windowOpen === false && (
        <div className="flex items-center gap-2 border-b border-amber-600/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          24-hour window closed — free-form replies aren&apos;t allowed. Only pre-approved template
          messages can reach this contact until they message again.
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.direction === "OUTBOUND" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                m.direction === "OUTBOUND"
                  ? "bg-violet-600 text-white"
                  : "bg-neutral-800 text-neutral-200",
              )}
            >
              <p>{m.body}</p>
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  m.direction === "OUTBOUND" ? "text-violet-200" : "text-neutral-500",
                )}
              >
                {m.senderType === "BOT" ? "Bot" : m.senderType === "AGENT" ? "You" : contactName} ·{" "}
                {m.sentAt.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-800 p-3">
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a reply..."
            disabled={isPending}
          />
          <Button type="button" onClick={send} disabled={isPending || !draft.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
