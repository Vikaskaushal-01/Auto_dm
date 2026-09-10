"use client";

import { useState, useTransition } from "react";
import { CheckCircle, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createDemoOrderAction } from "@/server/actions/products";

export function CheckoutForm({ productId, fileUrl }: { productId: string; fileUrl: string | null }) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDemoOrderAction(productId, email);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
        <CheckCircle className="mx-auto h-8 w-8 text-emerald-400" aria-hidden />
        <p className="mt-2 text-sm font-medium text-emerald-300">You&apos;re all set!</p>
        <p className="mt-1 text-xs text-neutral-400">A confirmation was sent to {email}.</p>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <Download className="h-4 w-4" />
            Download now
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Processing..." : "Get instant access"}
      </Button>
      <p className="text-center text-[11px] text-neutral-600">
        Demo checkout — no real payment is processed, no card details are collected.
      </p>
    </form>
  );
}
