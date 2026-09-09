"use client";

import { useState } from "react";
import { ExternalLink, Loader2, Zap } from "lucide-react";

interface MetaConnectButtonProps {
  platform: "instagram" | "facebook";
  isLive?: boolean;
  label?: string;
  className?: string;
}

export function MetaConnectButton({
  platform,
  isLive = false,
  label,
  className = "",
}: MetaConnectButtonProps) {
  const [loading, setLoading] = useState(false);

  const defaultLabel = isLive
    ? `Reconnect ${platform === "instagram" ? "Instagram" : "Facebook"} via Meta`
    : `Connect via Meta`;

  return (
    <a
      href={`/api/auth/meta/start?platform=${platform}`}
      onClick={() => setLoading(true)}
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-all shadow-sm ${
        isLive
          ? "border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white px-3.5 py-1.5 text-xs"
          : "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white hover:opacity-90 px-4 py-2 text-sm shadow-purple-950/40 hover:shadow-md"
      } ${loading ? "pointer-events-none opacity-80" : ""} ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-white" />
      ) : isLive ? (
        <ExternalLink className="h-3.5 w-3.5" />
      ) : (
        <Zap className="h-4 w-4 fill-current" />
      )}
      <span>{loading ? "Redirecting to Meta..." : label || defaultLabel}</span>
    </a>
  );
}
