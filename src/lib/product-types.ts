import type { LucideIcon } from "lucide-react";
import { FileText, BookOpen, LayoutTemplate, Video, Music, Archive, GraduationCap } from "lucide-react";

export const PRODUCT_TYPES = ["PDF", "EBOOK", "TEMPLATE", "VIDEO", "AUDIO", "ZIP", "COURSE"] as const;
export type ProductTypeValue = (typeof PRODUCT_TYPES)[number];
export type ProductType = ProductTypeValue;

export const PRODUCT_TYPE_META: Record<ProductTypeValue, { label: string; icon: LucideIcon }> = {
  PDF: { label: "PDF", icon: FileText },
  EBOOK: { label: "Ebook", icon: BookOpen },
  TEMPLATE: { label: "Template", icon: LayoutTemplate },
  VIDEO: { label: "Video", icon: Video },
  AUDIO: { label: "Audio", icon: Music },
  ZIP: { label: "Zip file", icon: Archive },
  COURSE: { label: "Course", icon: GraduationCap },
};
