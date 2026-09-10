"use client";

import { ExternalLink } from "lucide-react";

export function ConnectMetaLink({
  platform,
  label = "Connect via Meta",
}: {
  platform: "instagram" | "facebook";
  label?: string;
}) {
  return (
    <a
      href={`/api/auth/meta/start?platform=${platform}`}
      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:from-violet-500 hover:to-indigo-500 transition-colors"
    >
      <ExternalLink className="h-4 w-4" aria-hidden />
      {label}
    </a>
  );
}
