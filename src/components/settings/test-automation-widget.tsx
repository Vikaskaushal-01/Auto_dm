"use client";

import { useState, useTransition } from "react";
import { Zap, Play, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TestAutomationResult {
  ok?: boolean;
  error?: string;
  testedComment?: string;
  testedUser?: string;
  result?: {
    matched?: boolean;
    automationName?: string;
    publicReply?: string;
    dmBody?: string;
    leadId?: string;
    runId?: string;
    contactId?: string;
  };
}

export function TestAutomationWidget() {
  const [commentText, setCommentText] = useState("Send price");
  const [authorUsername, setAuthorUsername] = useState("test_buyer");
  const [result, setResult] = useState<TestAutomationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleTest = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/test/automation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commentText, authorUsername }),
        });
        const data = (await res.json()) as TestAutomationResult;
        setResult(data);
      } catch (e: unknown) {
        setResult({ ok: false, error: e instanceof Error ? e.message : "Test failed" });
      }
    });
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
      <div className="flex items-center gap-2.5 text-white">
        <Zap className="h-5 w-5 text-amber-400" />
        <h2 className="text-sm font-semibold">Test AutoDM Automation Engine</h2>
      </div>
      <p className="text-xs text-neutral-400">
        Simulate an incoming comment on your account to verify trigger matching, public replies,
        DM generation, and CRM lead capture.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[11px] font-medium text-neutral-400">
            Simulated Comment Text
          </label>
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
            placeholder="e.g. price, guide, info"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-neutral-400">
            Commenter Username
          </label>
          <input
            type="text"
            value={authorUsername}
            onChange={(e) => setAuthorUsername(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
            placeholder="e.g. digital_creator"
          />
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        disabled={isPending || !commentText}
        onClick={handleTest}
        className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-neutral-950 font-medium text-xs"
      >
        <Play className="h-3.5 w-3.5" />
        {isPending ? "Testing Execution..." : "Run Test Comment"}
      </Button>

      {result && (
        <div
          className={`rounded-lg border p-3 text-xs ${
            result.ok && result.result?.matched
              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
              : "border-neutral-800 bg-neutral-950 text-neutral-300"
          }`}
        >
          {result.ok && result.result?.matched ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Trigger Matched: {result.result.automationName}</span>
              </div>
              {result.result.publicReply && (
                <p>
                  <span className="text-neutral-400">Public Reply:</span> &quot;
                  {result.result.publicReply}&quot;
                </p>
              )}
              {result.result.dmBody && (
                <p>
                  <span className="text-neutral-400">DM Sent:</span> &quot;{result.result.dmBody}
                  &quot;
                </p>
              )}
              <p className="text-[11px] text-emerald-400/80">
                Created CRM Contact ID: {result.result.contactId} | Lead ID: {result.result.leadId}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-neutral-400">
              <XCircle className="h-4 w-4 text-neutral-500" />
              <span>
                No active automation triggered for keyword &quot;{commentText}&quot;. Check keywords in
                Automations.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
