"use client";

import { useState } from "react";
import { Copy, Check, Info, ExternalLink, Globe, Shield } from "lucide-react";

export function RedirectUriInfo({
  redirectUri,
  webhookUrl,
  verifyToken,
}: {
  redirectUri: string;
  webhookUrl: string;
  verifyToken?: string;
}) {
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const copyText = async (text: string, setter: (val: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-4 text-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium text-violet-300">
          <Info className="h-4 w-4 text-violet-400 shrink-0" />
          <span>Meta Live Configuration (Vercel & Production)</span>
        </div>
        <a
          href="https://developers.facebook.com/apps"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
        >
          <span>Open Meta Console</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="space-y-2">
        {/* 1. OAuth Redirect URI */}
        <div>
          <p className="text-neutral-300 mb-1 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-blue-400" />
            <span>
              1. <strong className="text-white">Valid OAuth Redirect URI</strong> (add under Instagram / Facebook Login settings):
            </span>
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/80 px-3 py-1.5 font-mono text-neutral-200">
            <span className="flex-1 truncate">{redirectUri}</span>
            <button
              type="button"
              onClick={() => copyText(redirectUri, setCopiedRedirect)}
              className="inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700 transition-colors"
            >
              {copiedRedirect ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Webhook Callback URL */}
        <div>
          <p className="text-neutral-300 mb-1 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              2. <strong className="text-white">Webhook Callback URL</strong> (add under Meta App Dashboard → Webhooks):
            </span>
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/80 px-3 py-1.5 font-mono text-neutral-200">
            <span className="flex-1 truncate">{webhookUrl}</span>
            <button
              type="button"
              onClick={() => copyText(webhookUrl, setCopiedWebhook)}
              className="inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700 transition-colors"
            >
              {copiedWebhook ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3. Verify Token */}
        {verifyToken && (
          <div>
            <p className="text-neutral-300 mb-1 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span>
                3. <strong className="text-white">Webhook Verify Token</strong>:
              </span>
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/80 px-3 py-1.5 font-mono text-neutral-200">
              <span className="flex-1 truncate">{verifyToken}</span>
              <button
                type="button"
                onClick={() => copyText(verifyToken, setCopiedToken)}
                className="inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700 transition-colors"
              >
                {copiedToken ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
