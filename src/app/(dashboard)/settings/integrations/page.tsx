import Image from "next/image";
import { CheckCircle2, Lock, MessageCircle } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getConnectedAccounts } from "@/lib/platform-accounts";
import { TIER_LABELS, type MessagingTier } from "@/lib/connectors/whatsapp";
import { RegenerateDemoDataButton } from "@/components/settings/regenerate-demo-data-button";
import { ConnectPlatformButton } from "@/components/settings/connect-platform-button";

export default async function IntegrationsSettingsPage() {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const accounts = await getConnectedAccounts(workspaceId);

  const instagram = accounts.find((a) => a.platform === "INSTAGRAM");
  const facebook = accounts.find((a) => a.platform === "MESSENGER");
  const whatsapp = accounts.find((a) => a.platform === "WHATSAPP");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Integrations</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Connect Instagram, Facebook, and WhatsApp to run automations on each.
        </p>
      </div>

      {/* Instagram */}
      {instagram && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-800">
              {instagram.avatarUrl && (
                <Image src={instagram.avatarUrl} alt="" fill sizes="48px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white">Instagram</p>
              <p className="text-sm text-neutral-400">@{instagram.username}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Connected (Demo Mode)
            </span>
          </div>
          <ConnectViaMetaNote />
          {instagram.connection?.lastSyncedAt && (
            <p className="mt-3 text-xs text-neutral-500">
              Last synced {instagram.connection.lastSyncedAt.toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Facebook */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-800">
            {facebook?.avatarUrl && (
              <Image src={facebook.avatarUrl} alt="" fill sizes="48px" className="object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-white">Facebook</p>
            <p className="text-sm text-neutral-400">
              {facebook ? `${facebook.displayName ?? facebook.username} (Page)` : "Page comments + Messenger"}
            </p>
          </div>
          {facebook ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Connected (Demo Mode)
            </span>
          ) : (
            <ConnectPlatformButton platform="FACEBOOK" />
          )}
        </div>
        <ConnectViaMetaNote />
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
              {whatsapp ? whatsapp.username : "Business messaging via the Cloud API"}
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
        <ConnectViaMetaNote whatsapp />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <h2 className="mb-1 text-sm font-semibold text-white">Demo Data</h2>
        <p className="mb-4 text-sm text-neutral-400">
          Regenerate a fresh 90-day Instagram dataset (followers, content, automations, AutoDM
          funnel) for this workspace.
        </p>
        <RegenerateDemoDataButton />
      </div>
    </div>
  );
}

function ConnectViaMetaNote({ whatsapp }: { whatsapp?: boolean }) {
  return (
    <div className="mt-4 border-t border-neutral-800 pt-4">
      <div
        className="group relative inline-block"
        title={
          whatsapp
            ? "Coming soon — requires a registered WhatsApp Business phone number and completed Business Verification"
            : "Coming soon — requires a Meta Developer App with Graph API access"
        }
      >
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-600"
        >
          <Lock className="h-4 w-4" aria-hidden />
          Connect via Meta
        </button>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        {whatsapp
          ? "Live WhatsApp data requires a registered Business phone number and completed Business Verification through Meta. Until then, this runs on realistic seeded demo conversations."
          : "Live data requires a Meta Developer App (App ID/Secret) and completed App Review for the scopes this platform uses. Until then, every page runs on realistic seeded demo data backed by the same database."}
      </p>
    </div>
  );
}
