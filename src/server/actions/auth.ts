"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { registerSchema } from "@/lib/validation/auth";
import { createUserWorkspaceWithDemoAccount } from "@/db/seed/workspace";

export interface RegisterActionResult {
  ok: boolean;
  error?: string;
}

export async function registerAction(input: unknown): Promise<RegisterActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email, password, workspaceName } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const baseSlug = slugify(workspaceName) || "workspace";
  let workspaceSlug = baseSlug;
  let suffix = 1;
  while (await db.workspace.findUnique({ where: { slug: workspaceSlug } })) {
    workspaceSlug = `${baseSlug}-${++suffix}`;
  }

  const igUsername = slugify(name).replace(/-/g, ".") || `creator${Date.now()}`;
  const passwordHash = await bcrypt.hash(password, 10);

  await createUserWorkspaceWithDemoAccount(db, {
    email,
    passwordHash,
    name,
    workspaceName,
    workspaceSlug,
    igUsername,
    igDisplayName: name,
  });

  return { ok: true };
}
