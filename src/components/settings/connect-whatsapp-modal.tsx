"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Key, Phone, Building2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectWhatsAppCredentialsAction } from "@/server/actions/data-management";

export function ConnectWhatsAppModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [systemUserToken, setSystemUserToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phoneNumberId || !systemUserToken) {
      setError("Phone Number ID and System User Token are required.");
      return;
    }

    startTransition(async () => {
      const res = await connectWhatsAppCredentialsAction({
        phoneNumber,
        phoneNumberId,
        wabaId,
        systemUserToken,
      });

      if (!res.ok) {
        setError(res.error ?? "Failed to connect WhatsApp account");
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  if (!open) {
    return (
      <Button
        variant="primary"
        size="sm"
        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        Connect Real WhatsApp
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Connect WhatsApp Cloud API</h2>
              <p className="text-xs text-neutral-400">Link your Meta WhatsApp Business Platform</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-neutral-500 hover:text-white text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300">
              WhatsApp Phone Number (with country code)
            </label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                placeholder="+1 555 123 4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2 pl-9 pr-3 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300">
              Phone Number ID <span className="text-red-400">*</span>
            </label>
            <div className="relative mt-1">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                required
                placeholder="e.g. 106593849182394"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2 pl-9 pr-3 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              From WhatsApp Manager / App Dashboard &gt; WhatsApp &gt; API Setup.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300">
              WhatsApp Business Account ID (WABA ID)
            </label>
            <div className="relative mt-1">
              <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                placeholder="e.g. 103948291039482"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2 pl-9 pr-3 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300">
              System User Access Token <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Paste permanent or long-lived access token with whatsapp_business_messaging scope..."
              value={systemUserToken}
              onChange={(e) => setSystemUserToken(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none font-mono"
            />
            <p className="mt-1 text-[11px] text-neutral-500">
              Tokens are encrypted at rest using AES-256-GCM.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isPending ? "Connecting..." : "Save & Connect"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
