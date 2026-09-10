"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <AlertTriangle className="h-10 w-10 text-amber-400" aria-hidden />
      <h1 className="mt-4 text-lg font-semibold text-white">Something went wrong</h1>
      <p className="mt-1 max-w-sm text-sm text-neutral-400">
        This page hit an unexpected error. Try again, or head back to the dashboard.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Link href="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
