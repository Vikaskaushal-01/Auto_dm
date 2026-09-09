"use client";

import { useState, useTransition } from "react";
import { Zap, Send, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { testAutomationAction, type TestAutomationResult } from "@/server/actions/automations";

interface AutomationTesterProps {
  automationId: string;
  defaultKeyword: string;
  defaultUsername: string;
  webhookUrl?: string;
  verifyToken?: string;
}

export function AutomationTester({
  automationId,
  defaultKeyword,
  defaultUsername,
  webhookUrl = "https://your-domain.com/api/webhooks/instagram",
  verifyToken = "autodm_verify_token_123",
}: AutomationTesterProps) {
  const [commentText, setCommentText] = useState(defaultKeyword || "website");
  const [username, setUsername] = useState(defaultUsername ? `@${defaultUsername.replace(/^@/, "")}` : "@nittinbhagaaat");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TestAutomationResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function handleTest() {
    startTransition(async () => {
      const res = await testAutomationAction({
        automationId,
        commentText,
        commenterUsername: username,
      });
      setResult(res);
    });
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* 1. Live Test & Trigger Console */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Test & Simulate Automation</h3>
              <p className="text-xs text-neutral-400">
                Simulate a user comment on your target reel to verify keyword matching and DM delivery.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            Engine Ready
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="test-comment" className="text-xs text-neutral-300">
              Comment Text
            </Label>
            <Input
              id="test-comment"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="e.g. WEBSITE"
              className="mt-1 bg-neutral-950 border-neutral-800 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="test-username" className="text-xs text-neutral-300">
              Commenter Username
            </Label>
            <Input
              id="test-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. @nittinbhagaaat"
              className="mt-1 bg-neutral-950 border-neutral-800 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <Button
            type="button"
            onClick={handleTest}
            disabled={isPending || !commentText.trim()}
            className="gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium px-4 py-2"
          >
            {isPending ? (
              <>Processing...</>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Test Run Trigger
              </>
            )}
          </Button>
        </div>

        {/* Execution Result Panel */}
        {result && (
          <div className="mt-5 border-t border-neutral-800/80 pt-4">
            {result.matched ? (
              <div className="space-y-4 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-semibold">
                    Keyword Matched & Actions Executed Successfully!
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                  {result.publicReplySent && (
                    <div className="rounded-md border border-neutral-800 bg-neutral-950/60 p-3">
                      <span className="text-neutral-400 font-medium block mb-1">💬 Public Comment Reply:</span>
                      <p className="text-neutral-200 font-medium">{result.publicReplyText || "Check DM"}</p>
                    </div>
                  )}

                  {result.dmSent && (
                    <div className="rounded-md border border-neutral-800 bg-neutral-950/60 p-3">
                      <span className="text-neutral-400 font-medium block mb-1">📩 Direct Message Sent:</span>
                      <p className="text-neutral-200 whitespace-pre-line">{result.dmText}</p>
                    </div>
                  )}
                </div>

                {result.automationRunId && (
                  <div className="text-[11px] text-neutral-500">
                    Logged in database as AutomationRun ID: <code className="text-neutral-400">{result.automationRunId}</code>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-4 text-xs text-amber-400 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Comment did not match trigger keyword</span>
                  <p className="mt-1 text-neutral-300">
                    The comment &quot;{commentText}&quot; does not match this automation&apos;s keyword group. Make sure your comment includes the target trigger word.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Webhook Configuration Card */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Meta Webhooks (Real-Time Instagram Comments)</h3>
            <p className="text-xs text-neutral-400">
              To trigger automations live when real users comment on Instagram, configure this webhook in your Meta App Dashboard.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div>
            <span className="text-neutral-400 block mb-1 font-medium">Callback URL:</span>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={webhookUrl}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 font-mono text-xs text-neutral-300 select-all"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(webhookUrl, "url")}
                className="shrink-0 border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300"
              >
                {copiedField === "url" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <div>
            <span className="text-neutral-400 block mb-1 font-medium">Verify Token:</span>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={verifyToken}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 font-mono text-xs text-neutral-300 select-all"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(verifyToken, "token")}
                className="shrink-0 border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300"
              >
                {copiedField === "token" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-neutral-800 bg-neutral-950/40 p-3 mt-3 text-neutral-400 space-y-1.5">
            <p className="font-medium text-neutral-300">How to activate 100% automated live comments:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Open your Meta App in <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-violet-400 hover:underline inline-flex items-center gap-0.5">Meta Developer Dashboard <ExternalLink className="h-2.5 w-2.5" /></a></li>
              <li>Go to <strong>Instagram</strong> &gt; <strong>Webhooks</strong> &gt; Edit Subscription.</li>
              <li>Paste the <strong>Callback URL</strong> and <strong>Verify Token</strong> above, then click <em>Verify and Save</em>.</li>
              <li>Subscribe to the <code className="text-neutral-200">comments</code> field. Every comment will immediately trigger your AutoDM!</li>
            </ol>
            <div className="mt-2 rounded border border-blue-500/20 bg-blue-950/30 p-2 text-[11px] text-blue-300">
              💡 <strong>Why not localhost?</strong> Meta&apos;s cloud servers cannot connect to <code className="text-blue-200">localhost:3000</code> on your laptop. We provide a live, secure public tunnel URL above (<code className="text-blue-200">trycloudflare.com</code>) so Meta can reach your local server and validate the subscription instantly.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
