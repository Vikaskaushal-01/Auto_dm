import { prisma } from "@/lib/prisma";

export async function getProducts(workspaceId: string) {
  return prisma.product.findMany({
    where: { workspaceId },
    include: { _count: { select: { orders: { where: { status: "PAID" } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getProductDetail(productId: string, workspaceId: string) {
  return prisma.product.findFirst({
    where: { id: productId, workspaceId },
    include: { orders: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
}

export async function getPublicProduct(productId: string) {
  return prisma.product.findFirst({ where: { id: productId, isActive: true } });
}
