"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import type { ProductType } from "@/generated/prisma/client";

export interface CreateProductInput {
  name: string;
  description: string;
  type: ProductType;
  priceRupees: number;
  fileUrl: string;
  coverImageUrl: string;
}

export async function createProductAction(input: CreateProductInput): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const product = await prisma.product.create({
    data: {
      workspaceId,
      name: input.name.trim() || "Untitled product",
      description: input.description.trim() || null,
      type: input.type,
      priceCents: Math.max(0, Math.round(input.priceRupees * 100)),
      fileUrl: input.fileUrl.trim() || null,
      coverImageUrl: input.coverImageUrl.trim() || null,
    },
  });
  revalidatePath("/products");
  redirect(`/products/${product.id}`);
}

export async function updateProductAction(
  productId: string,
  input: CreateProductInput,
): Promise<{ ok: boolean }> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const result = await prisma.product.updateMany({
    where: { id: productId, workspaceId },
    data: {
      name: input.name.trim() || "Untitled product",
      description: input.description.trim() || null,
      type: input.type,
      priceCents: Math.max(0, Math.round(input.priceRupees * 100)),
      fileUrl: input.fileUrl.trim() || null,
      coverImageUrl: input.coverImageUrl.trim() || null,
    },
  });
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  return { ok: result.count > 0 };
}

export async function toggleProductActiveAction(productId: string, isActive: boolean): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  await prisma.product.updateMany({ where: { id: productId, workspaceId }, data: { isActive } });
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
}

export async function deleteProductAction(productId: string): Promise<void> {
  const { workspaceId } = await getCurrentWorkspaceContext();
  await prisma.product.deleteMany({ where: { id: productId, workspaceId } });
  revalidatePath("/products");
  redirect("/products");
}

// No real payment processing is wired up. This creates a PAID order directly —
// the checkout UI clearly labels this as a demo purchase, no card details are
// collected. Real Stripe/Razorpay integration would create a PENDING order and
// flip it to PAID via a webhook instead of doing it synchronously here.
export async function createDemoOrderAction(
  productId: string,
  email: string,
): Promise<{ ok: boolean; error?: string; orderId?: string }> {
  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } });
  if (!product) return { ok: false, error: "Product not found" };
  if (!email.trim() || !email.includes("@")) return { ok: false, error: "Enter a valid email" };

  const order = await prisma.order.create({
    data: {
      workspaceId: product.workspaceId,
      productId: product.id,
      email: email.trim(),
      amountCents: product.priceCents,
      currency: product.currency,
      status: "PAID",
    },
  });
  return { ok: true, orderId: order.id };
}
