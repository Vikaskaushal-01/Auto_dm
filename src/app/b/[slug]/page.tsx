import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicBioPage } from "@/lib/bio";

const THEME_STYLES: Record<string, { bg: string; card: string; text: string; accent: string }> = {
  default: {
    bg: "bg-neutral-950",
    card: "bg-neutral-900 border border-neutral-800 hover:border-neutral-700",
    text: "text-neutral-100",
    accent: "text-neutral-400",
  },
  violet: {
    bg: "bg-gradient-to-b from-violet-950 via-neutral-950 to-neutral-950",
    card: "bg-violet-500/10 border border-violet-500/30 hover:bg-violet-500/20",
    text: "text-white",
    accent: "text-violet-300",
  },
  sunset: {
    bg: "bg-gradient-to-b from-orange-950 via-neutral-950 to-neutral-950",
    card: "bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20",
    text: "text-white",
    accent: "text-orange-300",
  },
  ocean: {
    bg: "bg-gradient-to-b from-sky-950 via-neutral-950 to-neutral-950",
    card: "bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20",
    text: "text-white",
    accent: "text-sky-300",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicBioPage(slug);
  if (!page) return { title: "Not found" };
  return {
    title: `${page.displayName} — Links`,
    description: page.bio ?? undefined,
  };
}

export default async function PublicBioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublicBioPage(slug);
  if (!page) notFound();

  const theme = THEME_STYLES[page.theme] ?? THEME_STYLES.default;

  return (
    <div className={`flex min-h-screen justify-center ${theme.bg} px-4 py-16`}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-800">
            {page.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={page.avatarUrl} alt={page.displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-neutral-400">{page.displayName[0]?.toUpperCase() ?? "?"}</span>
            )}
          </div>
          <h1 className={`mt-4 text-xl font-semibold ${theme.text}`}>{page.displayName}</h1>
          {page.bio && <p className={`mt-1.5 max-w-sm text-sm ${theme.accent}`}>{page.bio}</p>}
        </div>

        <div className="mt-8 space-y-3">
          {page.links.length === 0 ? (
            <p className={`text-center text-sm ${theme.accent}`}>No links yet.</p>
          ) : (
            page.links.map((link) => (
              <a
                key={link.id}
                href={`/api/bio/click/${link.id}`}
                target="_blank"
                rel="noreferrer"
                className={`block w-full rounded-xl px-5 py-3.5 text-center text-sm font-medium transition-colors ${theme.card} ${theme.text}`}
              >
                {link.label}
              </a>
            ))
          )}
        </div>

        <p className={`mt-10 text-center text-xs ${theme.accent}`}>Powered by AutoDM</p>
      </div>
    </div>
  );
}
