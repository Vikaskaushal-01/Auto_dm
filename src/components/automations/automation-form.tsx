"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TagListInput } from "./tag-list-input";
import { saveAutomationAction } from "@/server/actions/automations";
import { PERSONALIZATION_TOKENS, type AutomationFormInput } from "@/lib/validation/automation";
import { cn } from "@/lib/utils";

export interface AvailablePost {
  id: string;
  caption: string | null;
  thumbnailUrl: string | null;
}
export interface AvailableTag {
  id: string;
  name: string;
  color: string;
}

const DEFAULTS: AutomationFormInput = {
  name: "",
  status: "DRAFT",
  scope: "ALL_POSTS",
  targetPostIds: [],
  keywords: [],
  matchType: "CONTAINS",
  caseSensitive: false,
  publicReplyVariations: [],
  dmContentType: "LINK",
  dmBody: "",
  dmMediaUrl: "",
  linkLabel: "",
  linkDestinationUrl: "",
  requiresEmailCapture: true,
  requiresFollow: true,
  tagIds: [],
};

export function AutomationForm({
  automationId,
  initial,
  availablePosts,
  availableTags,
}: {
  automationId?: string;
  initial?: Partial<AutomationFormInput>;
  availablePosts: AvailablePost[];
  availableTags: AvailableTag[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AutomationFormInput>({ ...DEFAULTS, ...initial });
  const dmBodyRef = useRef<HTMLTextAreaElement>(null);

  function update<K extends keyof AutomationFormInput>(key: K, value: AutomationFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function insertToken(token: string) {
    const el = dmBodyRef.current;
    if (!el) {
      update("dmBody", form.dmBody + token);
      return;
    }
    const start = el.selectionStart ?? form.dmBody.length;
    const end = el.selectionEnd ?? form.dmBody.length;
    const next = form.dmBody.slice(0, start) + token + form.dmBody.slice(end);
    update("dmBody", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function submit(status: AutomationFormInput["status"]) {
    setError(null);
    const payload = { ...form, status };
    startTransition(async () => {
      const result = await saveAutomationAction(payload, automationId);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.push(`/automations/${result.automationId}/edit`);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(form.status);
      }}
      className="space-y-8"
    >
      {/* 1. Basics */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">1. Basics</h2>
        <div>
          <Label htmlFor="name">Automation name</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. AI Roadmap"
          />
        </div>
      </section>

      {/* 2. Trigger scope + keywords */}
      <section className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <h2 className="text-sm font-semibold text-white">2. Trigger</h2>

        <div>
          <Label htmlFor="scope">Applies to</Label>
          <select
            id="scope"
            value={form.scope}
            onChange={(e) => update("scope", e.target.value as AutomationFormInput["scope"])}
            className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="ALL_POSTS">Any post or reel</option>
            <option value="SPECIFIC_POSTS">Specific posts/reels</option>
            <option value="FUTURE_POSTS">Future posts/reels only</option>
          </select>
        </div>

        {form.scope === "SPECIFIC_POSTS" && (
          <div>
            <Label>Select posts</Label>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-neutral-800 p-2">
              {availablePosts.length === 0 && (
                <p className="p-2 text-sm text-neutral-500">No posts available yet.</p>
              )}
              {availablePosts.map((post) => {
                const checked = form.targetPostIds.includes(post.id);
                return (
                  <label
                    key={post.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-800"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        update(
                          "targetPostIds",
                          e.target.checked
                            ? [...form.targetPostIds, post.id]
                            : form.targetPostIds.filter((id) => id !== post.id),
                        )
                      }
                      className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="truncate text-sm text-neutral-300">
                      {post.caption ?? "Untitled"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <TagListInput
          label="Keywords"
          values={form.keywords}
          onChange={(v) => update("keywords", v)}
          placeholder="e.g. AI"
          helpText="Comment matches if it contains any of these keywords. Press Enter to add."
        />

        <div className="flex flex-wrap items-center gap-6">
          <div>
            <Label htmlFor="matchType">Match type</Label>
            <select
              id="matchType"
              value={form.matchType}
              onChange={(e) => update("matchType", e.target.value as AutomationFormInput["matchType"])}
              className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="CONTAINS">Contains keyword</option>
              <option value="EXACT">Exact match</option>
              <option value="ANY">Any comment</option>
            </select>
          </div>
          <Switch
            checked={form.caseSensitive}
            onChange={(v) => update("caseSensitive", v)}
            label="Case-sensitive"
          />
        </div>
      </section>

      {/* 3. Public reply */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">3. Public Reply</h2>
        <TagListInput
          label="Reply variations"
          values={form.publicReplyVariations}
          onChange={(v) => update("publicReplyVariations", v)}
          placeholder="e.g. Sent! Check your DMs 📩"
          helpText="One is picked at random each time, so replies don't look automated."
        />
      </section>

      {/* 4. DM builder */}
      <section className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <h2 className="text-sm font-semibold text-white">4. Direct Message</h2>

        <div>
          <Label htmlFor="dmContentType">Content type</Label>
          <select
            id="dmContentType"
            value={form.dmContentType}
            onChange={(e) => update("dmContentType", e.target.value as AutomationFormInput["dmContentType"])}
            className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="TEXT">Text only</option>
            <option value="LINK">Link</option>
            <option value="BUTTON">Button</option>
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
            <option value="FILE">File</option>
            <option value="PDF">PDF</option>
          </select>
        </div>

        <div>
          <Label htmlFor="dmBody">Message</Label>
          <Textarea
            id="dmBody"
            ref={dmBodyRef}
            rows={4}
            required
            value={form.dmBody}
            onChange={(e) => update("dmBody", e.target.value)}
            placeholder='Hey {{first_name}} 👋 here&apos;s what you asked for: {{link}}'
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PERSONALIZATION_TOKENS.map((token) => (
              <button
                key={token}
                type="button"
                onClick={() => insertToken(token)}
                className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400 hover:border-violet-500 hover:text-violet-300"
              >
                {token}
              </button>
            ))}
          </div>
        </div>

        {["IMAGE", "VIDEO", "FILE", "PDF"].includes(form.dmContentType) && (
          <div>
            <Label htmlFor="dmMediaUrl">Media URL</Label>
            <Input
              id="dmMediaUrl"
              type="url"
              value={form.dmMediaUrl}
              onChange={(e) => update("dmMediaUrl", e.target.value)}
              placeholder="https://..."
            />
          </div>
        )}

        {["LINK", "BUTTON"].includes(form.dmContentType) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="linkLabel">Link label</Label>
              <Input
                id="linkLabel"
                value={form.linkLabel}
                onChange={(e) => update("linkLabel", e.target.value)}
                placeholder="e.g. AI Roadmap PDF"
              />
            </div>
            <div>
              <Label htmlFor="linkDestinationUrl">Destination URL</Label>
              <Input
                id="linkDestinationUrl"
                type="url"
                value={form.linkDestinationUrl}
                onChange={(e) => update("linkDestinationUrl", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-6 border-t border-neutral-800 pt-4">
          <Switch
            checked={form.requiresFollow}
            onChange={(v) => update("requiresFollow", v)}
            label="Follow gate"
            description='Ask them to follow before unlocking the resource'
          />
          <Switch
            checked={form.requiresEmailCapture}
            onChange={(v) => update("requiresEmailCapture", v)}
            label="Collect email"
            description="Add them to your CRM as a lead"
          />
        </div>

        {availableTags.length > 0 && (
          <div>
            <Label>Tags to apply</Label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const checked = form.tagIds.includes(tag.id);
                return (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() =>
                      update(
                        "tagIds",
                        checked
                          ? form.tagIds.filter((id) => id !== tag.id)
                          : [...form.tagIds, tag.id],
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      checked
                        ? "border-violet-500 bg-violet-600/20 text-violet-300"
                        : "border-neutral-700 text-neutral-400 hover:border-neutral-500",
                    )}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={isPending} onClick={() => submit("DRAFT")}>
          Save as Draft
        </Button>
        <Button type="button" disabled={isPending} onClick={() => submit("ACTIVE")}>
          {isPending ? "Saving..." : "Save & Activate"}
        </Button>
      </div>
    </form>
  );
}
