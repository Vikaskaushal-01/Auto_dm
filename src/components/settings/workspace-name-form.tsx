"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateWorkspaceNameAction } from "@/server/actions/settings";

export function WorkspaceNameForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await updateWorkspaceNameAction(name);
          if (!result.ok) {
            setError(result.error ?? "Something went wrong.");
            return;
          }
          setMessage("Saved.");
        });
      }}
      className="space-y-3"
    >
      <div>
        <Label htmlFor="workspaceName">Workspace name</Label>
        <Input id="workspaceName" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
