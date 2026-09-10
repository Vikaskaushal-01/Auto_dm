import Image from "next/image";
import { MessageCircle, AlertTriangle, Check, ShieldCheck } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getConnectedAccounts } from "@/lib/platform-accounts";
import { TIER_LABELS, type MessagingTier } from "@/lib/connectors/whatsapp";
import { ConnectMetaLink } from "@/components/settings/connect-meta-link";
import { ConnectWhatsAppModal } from "@/components/settings/connect-whatsapp-modal";
import { SyncLiveButton } from "@/components/settings/sync-live-button";
import { WipeDemoButton } from "@/components/settings/wipe-demo-button";
import { TestAutomationWidget } from "@/components/settings/test-automation-widget";
import { RedirectUriInfo } from "@/components/settings/redirect-uri-info";
import { getLiveBaseUrl, getMetaRedirectUri } from "@/lib/server-url";

export default async function IntegrationsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;
  const { workspaceId } = await getCurrentWorkspaceContext();
  const accounts = await getConnectedAccounts(workspaceId);

  const instagram = accounts.find((a) => a.platform === "INSTAGRAM");
  const facebook = accounts.find((a) => a.platform === "MESSENGER");
  const whatsapp = accounts.find((a) => a.platform === "WHATSAPP");

  const liveBaseUrl = getLiveBaseUrl();
  const activeRedirectUri = getMetaRedirectUri();
  const webhookUrl = `${liveBaseUrl}/api/webhooks/meta`;
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "autodm_verify_token_123";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Integrations & Accounts</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Connect your real Instagram, Facebook, and WhatsApp accounts to automate DMs and replies.
        </p>
      </div>

      <RedirectUriInfo
        redirectUri={activeRedirectUri}
        webhookUrl={webhookUrl}
        verifyToken={verifyToken}
      />

      {/* Notifications from OAuth callback */}
      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-sm text-emerald-300">
          <Check className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>
            {success === "instagram_connected"
              ? "Your real Instagram Business account has been linked successfully!"
              : success === "facebook_connected"
              ? "Your real Facebook Page has been linked successfully!"
              : "Account connected successfully!"}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-200">Connection Error</p>
            <p className="mt-0.5 text-xs text-red-300/90">{decodeURIComponent(error)}</p>
          </div>
        </div>
      )}

      {/* Instagram Card */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-800 border border-neutral-700">
            {instagram?.avatarUrl ? (
              <Image src={instagram.avatarUrl} alt="" fill sizes="48px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-pink-500/20 text-pink-400 text-lg font-bold">
                IG
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">Instagram</p>
              {instagram ? (
                instagram.connection?.mode === "LIVE" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Live Account
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-neutral-400">
                    Connected
                  </span>
                )
              ) : null}
            </div>
            <p className="text-sm text-neutral-400">
              {instagram ? `@${instagram.username}` : "Not connected"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {instagram && instagram.connection?.mode === "LIVE" && (
              <SyncLiveButton socialAccountId={instagram.id} />
            )}
            <ConnectMetaLink
              platform="instagram"
              label={instagram?.connection?.mode === "LIVE" ? "Reconnect" : "Connect Real Account"}
            />
          </div>
        </div>

        {instagram?.connection && (
          <div className="flex items-center justify-between border-t border-neutral-800 pt-3 text-xs text-neutral-500">
            <span>
              Mode:{" "}
              <strong className={instagram.connection.mode === "LIVE" ? "text-emerald-400" : "text-neutral-400"}>
                {instagram.connection.mode}
              </strong>
            </span>
            {instagram.connection.lastSyncedAt && (
              <span>Last synced {new Date(instagram.connection.lastSyncedAt).toLocaleString()}</span>
            )}
          </div>
        )}
      </div>

      {/* Facebook Card */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-800 border border-neutral-700">
            {facebook?.avatarUrl ? (
              <Image src={facebook.avatarUrl} alt="" fill sizes="48px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-blue-500/20 text-blue-400 text-lg font-bold">
                FB
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">Facebook Page</p>
              {facebook ? (
                facebook.connection?.mode === "LIVE" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Live Page
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-neutral-400">
                    Connected
                  </span>
                )
              ) : null}
            </div>
            <p className="text-sm text-neutral-400">
              {facebook ? `${facebook.displayName ?? facebook.username} (Page)` : "Page comments & Messenger replies"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {facebook && facebook.connection?.mode === "LIVE" && (
              <SyncLiveButton socialAccountId={facebook.id} />
            )}
            <ConnectMetaLink
              platform="facebook"
              label={facebook?.connection?.mode === "LIVE" ? "Reconnect" : "Connect Real Page"}
            />
          </div>
        </div>
      </div>

      {/* WhatsApp Card */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <MessageCircle className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">WhatsApp Business</p>
              {whatsapp ? (
                whatsapp.connection?.mode === "LIVE" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Live Account
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-neutral-400">
                    Connected
                  </span>
                )
              ) : null}
            </div>
            <p className="text-sm text-neutral-400">
              {whatsapp ? whatsapp.username : "WhatsApp Cloud API for business messaging"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ConnectWhatsAppModal />
          </div>
        </div>

        {whatsapp?.connection && (
          <div className="grid grid-cols-3 gap-3 border-t border-neutral-800 pt-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Tier</p>
              <p className="mt-0.5 text-sm text-neutral-200">
                {TIER_LABELS[(whatsapp.connection.messagingTier ?? "TIER_1") as MessagingTier]}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Quality</p>
              <p className="mt-0.5 text-sm text-emerald-400">{whatsapp.connection.qualityRating ?? "GREEN"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Daily Limit</p>
              <p className="mt-0.5 text-sm text-neutral-200">
                {whatsapp.connection.dailyMessageLimit?.toLocaleString() ?? "250"} contacts
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Automation Test Widget */}
      <TestAutomationWidget />

      {/* Data Management: Seed vs Pure Real Data */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Data Management & Cleanup</h2>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Switching from test mode to production? You can wipe the seeded demo dataset (Aarav Creator Studio,
          fake reels, simulated followers) so your workspace contains only your real linked accounts and real data.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <WipeDemoButton />
        </div>
      </div>
    </div>
  );
}
