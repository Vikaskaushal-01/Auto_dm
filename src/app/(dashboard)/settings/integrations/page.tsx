import Image from "next/image";
import { AlertCircle, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getConnectedAccounts } from "@/lib/platform-accounts";
import { TIER_LABELS, type MessagingTier } from "@/lib/connectors/whatsapp";
import { RegenerateDemoDataButton } from "@/components/settings/regenerate-demo-data-button";
import { ConnectPlatformButton } from "@/components/settings/connect-platform-button";
import { MetaConnectButton } from "@/components/settings/meta-connect-button";
import { ToggleModeButton } from "@/components/settings/toggle-mode-button";

interface IntegrationsPageProps {
  searchParams?: Promise<{ connected?: string; error?: string }>;
}

export default async function IntegrationsSettingsPage({ searchParams }: IntegrationsPageProps) {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const accounts = await getConnectedAccounts(workspaceId);

  const query = searchParams ? await searchParams : {};
  const connectedPlatform = query.connected;
  const errorMessage = query.error;

  const instagram = accounts.find((a) => a.platform === "INSTAGRAM");
  const facebook = accounts.find((a) => a.platform === "MESSENGER");
  const whatsapp = accounts.find((a) => a.platform === "WHATSAPP");

  const isInstagramLive = instagram?.connection?.mode === "LIVE";
  const isFacebookLive = facebook?.connection?.mode === "LIVE";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Integrations</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Connect your live Meta (Instagram / Facebook) accounts or use realistic demo data to run automations.
        </p>
      </div>

      {/* Success Notification Banner */}
      {connectedPlatform && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div className="text-sm">
            <p className="font-semibold text-emerald-200">
              Successfully connected {connectedPlatform === "instagram" ? "Instagram" : "Facebook"} via Meta!
            </p>
            <p className="mt-0.5 text-xs text-emerald-300/80">
              Your account is now operating in <strong>LIVE Mode</strong> with real Graph API access for automations, posts, and direct messages.
            </p>
          </div>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-rose-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div className="text-sm">
            <p className="font-semibold text-rose-200">Connection Notice</p>
            <p className="mt-0.5 text-xs text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Instagram */}
      {instagram && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-800 border border-neutral-700">
              {instagram.avatarUrl && (
                <Image src={instagram.avatarUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-white">Instagram</p>
                {isInstagramLive && (
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-400">@{instagram.username}</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                isInstagramLive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {isInstagramLive ? "Connected (Live Mode)" : "Connected (Demo Mode)"}
            </span>
          </div>

          <div className="rounded-lg border border-neutral-800/80 bg-neutral-950/40 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-neutral-300">
                  {isInstagramLive
                    ? "Live Meta Graph API connection active"
                    : "Simulated with realistic 90-day demo engagement"}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {isInstagramLive
                    ? "Direct messages, replies, and posts are synchronized directly with Instagram."
                    : "Connect via your Meta Developer App to switch this account to live Instagram mode."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <MetaConnectButton
                  platform="instagram"
                  isLive={isInstagramLive}
                  label={isInstagramLive ? "Reconnect Account" : "Connect via Meta"}
                />
                <ToggleModeButton
                  socialAccountId={instagram.id}
                  currentMode={instagram.connection?.mode || "DEMO"}
                />
              </div>
            </div>
          </div>

          {instagram.connection?.lastSyncedAt && (
            <p className="text-xs text-neutral-500">
              Last synced {new Date(instagram.connection.lastSyncedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Facebook */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-800 border border-neutral-700">
            {facebook?.avatarUrl ? (
              <Image src={facebook.avatarUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-bold text-blue-500">f</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-white">Facebook</p>
            <p className="text-sm text-neutral-400">
              {facebook ? `${facebook.displayName ?? facebook.username} (Page)` : "Page comments + Messenger"}
            </p>
          </div>
          {facebook ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                isFacebookLive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {isFacebookLive ? "Connected (Live Mode)" : "Connected (Demo Mode)"}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <MetaConnectButton platform="facebook" label="Connect Page" />
              <ConnectPlatformButton platform="FACEBOOK" />
            </div>
          )}
        </div>

        {facebook && (
          <div className="rounded-lg border border-neutral-800/80 bg-neutral-950/40 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-neutral-300">
                  {isFacebookLive ? "Live Page Messenger active" : "Connected in Demo mode"}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {isFacebookLive
                    ? "Messenger automations and page post comment replies run through Meta Graph API."
                    : "Connect your real Facebook Page via Meta to switch to live mode."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <MetaConnectButton
                  platform="facebook"
                  isLive={isFacebookLive}
                  label={isFacebookLive ? "Reconnect Page" : "Connect via Meta"}
                />
                <ToggleModeButton
                  socialAccountId={facebook.id}
                  currentMode={facebook.connection?.mode || "DEMO"}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-400">
            <MessageCircle className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-white">WhatsApp</p>
            <p className="text-sm text-neutral-400">
              {whatsapp ? whatsapp.username : "Business messaging via Cloud API"}
            </p>
          </div>
          {whatsapp ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Connected (Demo Mode)
            </span>
          ) : (
            <ConnectPlatformButton platform="WHATSAPP" />
          )}
        </div>

        {whatsapp?.connection && (
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-neutral-800 pt-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Tier</p>
              <p className="mt-0.5 text-sm text-neutral-200">
                {TIER_LABELS[(whatsapp.connection.messagingTier ?? "TIER_1") as MessagingTier]}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Quality</p>
              <p className="mt-0.5 text-sm text-emerald-400">{whatsapp.connection.qualityRating ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Daily limit</p>
              <p className="mt-0.5 text-sm text-neutral-200">
                {whatsapp.connection.dailyMessageLimit?.toLocaleString() ?? "—"} contacts
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 border-t border-neutral-800 pt-4">
          <p className="text-xs text-neutral-500">
            Live WhatsApp messaging requires a verified Meta Business Account with a registered WhatsApp Business phone number and Cloud API token.
          </p>
        </div>
      </div>

      {/* Demo Data Management */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Demo Dataset Generator</h2>
        </div>
        <p className="mb-4 text-sm text-neutral-400">
          Regenerate a fresh 90-day Instagram dataset (followers, content, automations, AutoDM funnel) for testing.
        </p>
        <RegenerateDemoDataButton />
      </div>
    </div>
  );
}
