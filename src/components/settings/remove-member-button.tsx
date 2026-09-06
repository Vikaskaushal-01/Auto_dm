"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { removeTeamMemberAction } from "@/server/actions/settings";

export function RemoveMemberButton({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await removeTeamMemberAction(memberId);
          router.refresh();
        })
      }
      className="text-neutral-500 hover:text-red-400 disabled:opacity-50"
      aria-label="Remove member"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
