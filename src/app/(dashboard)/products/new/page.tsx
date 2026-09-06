import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";

export default function NewProductPage() {
  return (
    <div className="max-w-xl space-y-6">
      <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to products
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-white">New product</h1>
        <p className="mt-1 text-sm text-neutral-400">Set up a digital product to sell.</p>
      </div>
      <ProductForm />
    </div>
  );
}
