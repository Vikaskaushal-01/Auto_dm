"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PRODUCT_TYPES, PRODUCT_TYPE_META, type ProductTypeValue } from "@/lib/product-types";
import { createProductAction, updateProductAction, type CreateProductInput } from "@/server/actions/products";

export function ProductForm({
  productId,
  initial,
}: {
  productId?: string;
  initial?: Partial<CreateProductInput>;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<ProductTypeValue>((initial?.type as ProductTypeValue) ?? "PDF");
  const [priceRupees, setPriceRupees] = useState(initial?.priceRupees ?? 499);
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: CreateProductInput = { name, description, type, priceRupees, fileUrl, coverImageUrl };
    startTransition(async () => {
      if (productId) {
        const result = await updateProductAction(productId, input);
        setMessage(result.ok ? "Saved" : "Failed to save");
        if (result.ok) router.refresh();
      } else {
        await createProductAction(input);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-400">Product name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ultimate AI Prompt Pack" required />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-400">Description</label>
        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's included, who it's for..." />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ProductTypeValue)}
            className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PRODUCT_TYPE_META[t].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Price (₹)</label>
          <Input
            type="number"
            min={0}
            value={priceRupees}
            onChange={(e) => setPriceRupees(Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-400">Cover image URL</label>
        <Input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://..." />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-400">File URL (delivered after purchase)</label>
        <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." />
      </div>

      <div className="flex items-center justify-between pt-2">
        {message && <span className="text-xs text-neutral-500">{message}</span>}
        <Button type="submit" disabled={isPending} className="ml-auto">
          {isPending ? "Saving..." : productId ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
