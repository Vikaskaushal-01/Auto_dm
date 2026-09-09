"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Lock, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, type NavSection } from "./nav-config";

function SectionLink({ section, active }: { section: NavSection; active: boolean }) {
  const Icon = section.icon;
  if (section.locked) {
    return (
      <div
        className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-500"
        title={section.lockedReason}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="flex-1">{section.label}</span>
        <Lock className="h-3.5 w-3.5 shrink-0" aria-label="Coming soon" />
      </div>
    );
  }
  return (
    <Link
      href={section.href!}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-violet-600/15 text-violet-300"
          : "text-neutral-300 hover:bg-neutral-800 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {section.label}
    </Link>
  );
}

function SectionGroup({ section, pathname }: { section: NavSection; pathname: string }) {
  const Icon = section.icon;
  const isChildActive = section.children?.some((c) => pathname.startsWith(c.href)) ?? false;
  const [open, setOpen] = useState(isChildActive || false);

  if (section.locked) {
    return <SectionLink section={section} active={false} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isChildActive
            ? "text-violet-300"
            : "text-neutral-300 hover:bg-neutral-800 hover:text-white",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-neutral-800 pl-4">
          {section.children!.map((leaf) => {
            const active = pathname.startsWith(leaf.href);
            return (
              <Link
                key={leaf.href}
                href={leaf.href}
                className={cn(
                  "block rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-violet-600/15 text-violet-300"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white",
                )}
              >
                {leaf.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  mobileOpen = false,
  onCloseMobile,
  isLive = false,
  instagramUsername,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  isLive?: boolean;
  instagramUsername?: string;
}) {
  const pathname = usePathname();

  // Close the mobile drawer automatically whenever the route changes.
  useEffect(() => {
    onCloseMobile?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const content = (
    <>
      <div className="flex h-16 items-center justify-between gap-2 border-b border-neutral-800 px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
            A
          </div>
          <span className="text-base font-semibold text-white">AutoDM</span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white md:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_SECTIONS.map((section) =>
          section.children ? (
            <SectionGroup key={section.label} section={section} pathname={pathname} />
          ) : (
            <SectionLink
              key={section.label}
              section={section}
              active={!section.locked && pathname.startsWith(section.href!)}
            />
          ),
        )}
      </nav>

      <div className="border-t border-neutral-800 p-3">
        {isLive ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-xs text-emerald-300">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate font-medium">Live · @{instagramUsername}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 px-3 py-2.5 text-xs text-violet-200">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            <span>Demo mode — connect Instagram in Settings when ready.</span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: static sidebar, always visible */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950 md:flex">
        {content}
      </aside>

      {/* Mobile: slide-over drawer + backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-neutral-800 bg-neutral-950 transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {content}
      </aside>
    </>
  );
}
