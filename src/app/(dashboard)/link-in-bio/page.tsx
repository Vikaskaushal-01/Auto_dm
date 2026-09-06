import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getOrCreateBioPage } from "@/lib/bio";
import { BioSettingsForm } from "@/components/bio/bio-settings-form";
import { BioLinkList } from "@/components/bio/bio-link-list";

export default async function LinkInBioPage() {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const page = await getOrCreateBioPage(workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Link-in-Bio</h1>
          <p className="mt-1 text-sm text-neutral-400">One page for all your links — drop it in your Instagram bio.</p>
        </div>
        <Link
          href={`/b/${page.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          <ExternalLink className="h-4 w-4" />
          autodm.app/b/{page.slug}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <BioSettingsForm
            initialDisplayName={page.displayName}
            initialBio={page.bio ?? ""}
            initialAvatarUrl={page.avatarUrl ?? ""}
            initialTheme={page.theme}
            initialSlug={page.slug}
          />
          <BioLinkList bioPageId={page.id} links={page.links} />
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-xs font-medium text-neutral-500">Live preview</p>
          <div className="overflow-hidden rounded-2xl border border-neutral-800">
            <iframe
              src={`/b/${page.slug}?preview=${Date.now()}`}
              className="h-[640px] w-full bg-neutral-950"
              title="Bio page preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
