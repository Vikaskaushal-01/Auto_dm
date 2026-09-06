"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { inviteTeamMemberAction } from "@/server/actions/settings";

export function InviteMemberForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await inviteTeamMemberAction(email);
          if (!result.ok) {
            setError(result.error ?? "Something went wrong.");
            return;
          }
          setEmail("");
          router.refresh();
        });
      }}
      className="flex flex-wrap items-start gap-2"
    >
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="teammate@example.com"
        className="max-w-xs"
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Inviting..." : "Invite"}
      </Button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
