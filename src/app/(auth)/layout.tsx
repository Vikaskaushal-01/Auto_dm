import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-bold text-white">
            A
          </div>
          <span className="text-lg font-semibold text-white">AutoDM</span>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 shadow-xl shadow-black/20 backdrop-blur">
          {children}
        </div>
      </div>
    </div>
  );
}
