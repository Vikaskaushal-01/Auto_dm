"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectPlatformAction } from "@/server/actions/settings";

export function ConnectPlatformButton({ platform }: { platform: "FACEBOOK" | "WHATSAPP" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await connectPlatformAction(platform);
          router.refresh();
        })
      }
    >
      <Sparkles className="h-4 w-4" aria-hidden />
      {isPending ? "Connecting..." : "Use Demo Data"}
    </Button>
  );
}
