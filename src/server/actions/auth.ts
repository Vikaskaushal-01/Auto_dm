"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { registerSchema } from "@/lib/validation/auth";

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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const baseSlug = slugify(workspaceName) || "workspace";
  let workspaceSlug = baseSlug;
  let suffix = 1;
  while (await prisma.workspace.findUnique({ where: { slug: workspaceSlug } })) {
    workspaceSlug = `${baseSlug}-${++suffix}`;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: workspaceName,
      slug: workspaceSlug,
      plan: "FREE",
    },
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  return { ok: true };
}
