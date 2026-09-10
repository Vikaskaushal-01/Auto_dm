"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountSwitcher, type ConnectedAccountSummary } from "./account-switcher";

export function Topbar({
  workspaceName,
  userName,
  userEmail,
  accounts,
  onOpenMobileMenu,
}: {
  workspaceName: string;
  userName: string;
  userEmail: string;
  accounts: ConnectedAccountSummary[];
  onOpenMobileMenu?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-sm font-semibold text-white">{workspaceName}</p>
          <p className="text-xs text-neutral-500">
            {accounts.length > 0
              ? `${accounts.map((a) => a.platform.toLowerCase()).join(" · ")} · Live`
              : "No accounts connected"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <AccountSwitcher accounts={accounts} />
        <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block leading-tight">{userName}</span>
            <span className="block text-xs leading-tight text-neutral-500">{userEmail}</span>
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-neutral-800 bg-neutral-900 py-1 shadow-xl">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
