"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateBioPageAction } from "@/server/actions/bio";

const THEMES = [
  { value: "default", label: "Default" },
  { value: "violet", label: "Violet" },
  { value: "sunset", label: "Sunset" },
  { value: "ocean", label: "Ocean" },
];

export function BioSettingsForm({
  initialDisplayName,
  initialBio,
  initialAvatarUrl,
  initialTheme,
  initialSlug,
}: {
  initialDisplayName: string;
  initialBio: string;
  initialAvatarUrl: string;
  initialTheme: string;
  initialSlug: string;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [theme, setTheme] = useState(initialTheme);
  const [slug, setSlug] = useState(initialSlug);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await updateBioPageAction({ displayName, bio, avatarUrl, theme, slug });
      setMessage(result.ok ? "Saved" : (result.error ?? "Something went wrong"));
      if (result.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <h2 className="text-sm font-semibold text-white">Page settings</h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-400">Your link</label>
        <div className="flex items-center gap-1 text-sm text-neutral-500">
          <span className="shrink-0">autodm.app/b/</span>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="your-name" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-400">Display name</label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-400">Bio</label>
        <Textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short line about you" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-400">Avatar URL</label>
        <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-400">Theme</label>
        <div className="grid grid-cols-4 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={`rounded-lg border px-2 py-2 text-xs ${
                theme === t.value ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-neutral-700 text-neutral-400 hover:bg-neutral-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {message && <span className="text-xs text-neutral-500">{message}</span>}
        <Button type="submit" disabled={isPending} className="ml-auto">
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
