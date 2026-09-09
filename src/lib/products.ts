import { db } from "@/lib/db";

export async function getProducts(workspaceId: string) {
  return db.product.findMany({
    where: { workspaceId },
    include: { _count: { select: { orders: { where: { status: "PAID" } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getProductDetail(productId: string, workspaceId: string) {
  return db.product.findFirst({
    where: { id: productId, workspaceId },
    include: { orders: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
}

export async function getPublicProduct(productId: string) {
  return db.product.findFirst({ where: { id: productId, isActive: true } });
}
