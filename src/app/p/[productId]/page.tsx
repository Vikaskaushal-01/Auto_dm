import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicProduct } from "@/lib/products";
import { PRODUCT_TYPE_META, type ProductTypeValue } from "@/lib/product-types";
import { formatCurrencyINR } from "@/lib/analytics/format";
import { CheckoutForm } from "@/components/products/checkout-form";

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }): Promise<Metadata> {
  const { productId } = await params;
  const product = await getPublicProduct(productId);
  if (!product) return { title: "Not found" };
  return { title: product.name, description: product.description ?? undefined };
}

export default async function PublicProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const product = await getPublicProduct(productId);
  if (!product) notFound();

  const meta = PRODUCT_TYPE_META[product.type as ProductTypeValue];
  const Icon = meta.icon;

  return (
    <div className="flex min-h-screen justify-center bg-neutral-950 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
          <div className="flex h-48 items-center justify-center bg-neutral-800">
            {product.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.coverImageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <Icon className="h-16 w-16 text-neutral-600" aria-hidden />
            )}
          </div>
          <div className="p-6">
            <span className="flex items-center gap-1.5 text-xs text-neutral-500">
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </span>
            <h1 className="mt-1.5 text-xl font-semibold text-white">{product.name}</h1>
            {product.description && <p className="mt-2 text-sm text-neutral-400">{product.description}</p>}
            <p className="mt-4 text-2xl font-semibold text-emerald-400">{formatCurrencyINR(product.priceCents / 100)}</p>

            <div className="mt-5 border-t border-neutral-800 pt-5">
              <CheckoutForm productId={product.id} fileUrl={product.fileUrl} />
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-neutral-600">Powered by AutoDM</p>
      </div>
    </div>
  );
}
