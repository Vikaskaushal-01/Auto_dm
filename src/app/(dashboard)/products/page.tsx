import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { getProducts } from "@/lib/products";
import { PRODUCT_TYPE_META, type ProductTypeValue } from "@/lib/product-types";
import { formatCurrencyINR, formatCount } from "@/lib/analytics/format";

export default async function ProductsPage() {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const products = await getProducts(workspaceId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Products</h1>
          <p className="mt-1 text-sm text-neutral-400">Sell digital products directly from your DMs and bio link.</p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          <Plus className="h-4 w-4" />
          New Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center">
          <Package className="mx-auto h-8 w-8 text-neutral-600" aria-hidden />
          <p className="mt-3 text-sm text-neutral-400">No products yet. Create one to start selling.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const meta = PRODUCT_TYPE_META[product.type as ProductTypeValue];
            const Icon = meta.icon;
            return (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-colors hover:border-neutral-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </span>
                  {!product.isActive && (
                    <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-500">Unlisted</span>
                  )}
                </div>
                <h2 className="mt-2 truncate font-medium text-white">{product.name}</h2>
                <p className="mt-1 text-lg font-semibold text-emerald-400">{formatCurrencyINR(product.priceCents / 100)}</p>
                <p className="mt-2 text-xs text-neutral-500">{formatCount(product._count.orders)} sold</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
