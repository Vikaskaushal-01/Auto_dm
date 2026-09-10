"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction } from "@/server/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    workspaceName: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await registerAction(form);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      const signInResult = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (signInResult?.error) {
        setError("Account created — please log in.");
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Create your workspace</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Automate comments, DMs, leads, and sales across Instagram, Facebook, and WhatsApp.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Alex Smith"
          />
        </div>
        <div>
          <Label htmlFor="workspaceName">Workspace name</Label>
          <Input
            id="workspaceName"
            required
            value={form.workspaceName}
            onChange={(e) => setForm({ ...form, workspaceName: e.target.value })}
            placeholder="My Creator Studio"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="At least 8 characters"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Creating workspace..." : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-400">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-400 hover:text-violet-300">
          Log in
        </Link>
      </p>
    </div>
  );
}
