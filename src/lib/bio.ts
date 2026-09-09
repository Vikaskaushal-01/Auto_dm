import { db } from "@/lib/db";

export async function getOrCreateBioPage(workspaceId: string) {
  const existing = await db.bioPage.findUnique({
    where: { workspaceId },
    include: { links: { orderBy: { order: "asc" } } },
  });
  if (existing) return existing;

  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });

  let slug = workspace.slug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? slug : `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const taken = await db.bioPage.findUnique({ where: { slug: candidate } });
    if (!taken) {
      slug = candidate;
      break;
    }
  }

  const created = await db.bioPage.create({
    data: { workspaceId, slug, displayName: workspace.name },
    include: { links: { orderBy: { order: "asc" } } },
  });
  return created;
}

export async function getPublicBioPage(slug: string) {
  return db.bioPage.findUnique({
    where: { slug },
    include: { links: { orderBy: { order: "asc" } } },
  });
}
