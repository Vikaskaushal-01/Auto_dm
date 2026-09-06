"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }
      router.push(searchParams.get("callbackUrl") ?? "/dashboard");
      router.refresh();
    });
  }

  function fillDemoCredentials() {
    setForm({ email: "demo@autodm.app", password: "Demo1234!" });
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Welcome back</h1>
      <p className="mt-1 text-sm text-neutral-400">Log in to your AutoDM workspace.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Logging in..." : "Log in"}
        </Button>
      </form>

      <button
        type="button"
        onClick={fillDemoCredentials}
        className="mt-4 w-full rounded-lg border border-dashed border-neutral-700 py-2 text-xs text-neutral-400 hover:border-violet-500 hover:text-violet-300"
      >
        Use demo credentials (demo@autodm.app)
      </button>

      <p className="mt-6 text-center text-sm text-neutral-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-violet-400 hover:text-violet-300">
          Sign up
        </Link>
      </p>
    </div>
  );
}
