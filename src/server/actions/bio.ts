"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { slugify } from "@/lib/utils";

export interface UpdateBioPageInput {
  displayName: string;
  bio: string;
  avatarUrl: string;
  theme: string;
  slug: string;
}

export async function updateBioPageAction(
  input: UpdateBioPageInput,
): Promise<{ ok: boolean; error?: string }> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const slug = slugify(input.slug) || "creator";

  const conflict = await db.bioPage.findUnique({ where: { slug } });
  if (conflict && conflict.workspaceId !== workspaceId) {
    return { ok: false, error: "That link is already taken. Try a different one." };
  }

  await db.bioPage.update({
    where: { workspaceId },
    data: {
      displayName: input.displayName.trim() || "Creator",
      bio: input.bio.trim() || null,
      avatarUrl: input.avatarUrl.trim() || null,
      theme: input.theme,
      slug,
    },
  });
  revalidatePath("/link-in-bio");
  revalidatePath(`/b/${slug}`);
  return { ok: true };
}

export async function addBioLinkAction(bioPageId: string, label: string, url: string): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const page = await db.bioPage.findFirst({ where: { id: bioPageId, workspaceId } });
  if (!page) return;

  const last = await db.bioLink.findFirst({ where: { bioPageId }, orderBy: { order: "desc" } });
  await db.bioLink.create({
    data: {
      bioPageId,
      label: label.trim() || "Untitled link",
      url: normalizeUrl(url),
      order: (last?.order ?? -1) + 1,
    },
  });
  revalidatePath("/link-in-bio");
  revalidatePath(`/b/${page.slug}`);
}

export async function updateBioLinkAction(linkId: string, label: string, url: string): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const link = await db.bioLink.findFirst({
    where: { id: linkId, bioPage: { workspaceId } },
    include: { bioPage: true },
  });
  if (!link) return;
  await db.bioLink.update({
    where: { id: linkId },
    data: { label: label.trim() || "Untitled link", url: normalizeUrl(url) },
  });
  revalidatePath("/link-in-bio");
  revalidatePath(`/b/${link.bioPage.slug}`);
}

export async function deleteBioLinkAction(linkId: string): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const link = await db.bioLink.findFirst({
    where: { id: linkId, bioPage: { workspaceId } },
    include: { bioPage: true },
  });
  if (!link) return;
  await db.bioLink.delete({ where: { id: linkId } });
  revalidatePath("/link-in-bio");
  revalidatePath(`/b/${link.bioPage.slug}`);
}

export async function moveBioLinkAction(linkId: string, direction: "up" | "down"): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const link = await db.bioLink.findFirst({
    where: { id: linkId, bioPage: { workspaceId } },
    include: { bioPage: { include: { links: { orderBy: { order: "asc" } } } } },
  });
  if (!link) return;

  const links = link.bioPage.links;
  const index = links.findIndex((l) => l.id === linkId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= links.length) return;

  const other = links[swapWith];
  await db.$transaction([
    db.bioLink.update({ where: { id: link.id }, data: { order: other.order } }),
    db.bioLink.update({ where: { id: other.id }, data: { order: link.order } }),
  ]);
  revalidatePath("/link-in-bio");
  revalidatePath(`/b/${link.bioPage.slug}`);
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "https://";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
