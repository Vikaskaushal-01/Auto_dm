"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { ConnectedAccountSummary } from "./account-switcher";

export function DashboardChrome({
  workspaceName,
  userName,
  userEmail,
  accounts,
  isLive = false,
  instagramUsername,
  children,
}: {
  workspaceName: string;
  userName: string;
  userEmail: string;
  accounts: ConnectedAccountSummary[];
  isLive?: boolean;
  instagramUsername?: string;
  children: ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        isLive={isLive}
        instagramUsername={instagramUsername}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          workspaceName={workspaceName}
          userName={userName}
          userEmail={userEmail}
          accounts={accounts}
          isLive={isLive}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
