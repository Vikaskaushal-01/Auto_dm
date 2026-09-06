import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getProductDetail } from "@/lib/products";
import { formatCurrencyINR } from "@/lib/analytics/format";
import { ProductForm } from "@/components/products/product-form";
import { ProductActiveToggle } from "@/components/products/product-active-toggle";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { deleteProductAction } from "@/server/actions/products";

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-emerald-500/15 text-emerald-400",
  PENDING: "bg-amber-500/15 text-amber-400",
  REFUNDED: "bg-neutral-700/50 text-neutral-400",
  FAILED: "bg-red-500/15 text-red-400",
};

export default async function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const { workspaceId } = await getCurrentWorkspaceContext();
  const product = await getProductDetail(productId, workspaceId);
  if (!product) notFound();

  const revenueCents = product.orders.filter((o) => o.status === "PAID").reduce((acc, o) => acc + o.amountCents, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to products
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">{product.name}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {formatCurrencyINR(revenueCents / 100)} earned · {product.orders.filter((o) => o.status === "PAID").length} sales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/p/${product.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            <ExternalLink className="h-4 w-4" />
            View checkout page
          </Link>
          <ProductActiveToggle productId={product.id} isActive={product.isActive} />
        </div>
      </div>

      <ProductForm
        productId={product.id}
        initial={{
          name: product.name,
          description: product.description ?? "",
          type: product.type,
          priceRupees: product.priceCents / 100,
          fileUrl: product.fileUrl ?? "",
          coverImageUrl: product.coverImageUrl ?? "",
        }}
      />

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Orders</h2>
        {product.orders.length === 0 ? (
          <p className="text-sm text-neutral-500">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {product.orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-lg border border-neutral-800 px-3 py-2 text-sm">
                <span className="truncate text-neutral-300">{order.email}</span>
                <span className="text-neutral-500">{order.createdAt.toLocaleDateString()}</span>
                <span className="text-neutral-300">{formatCurrencyINR(order.amountCents / 100)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[order.status]}`}>{order.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-800 pt-4">
        <ConfirmDeleteButton label="Delete product" onConfirm={deleteProductAction.bind(null, product.id)} />
      </div>
    </div>
  );
}
