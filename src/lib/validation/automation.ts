import { z } from "zod";

export const automationFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  status: z.enum(["ACTIVE", "PAUSED", "DRAFT"]),
  scope: z.enum(["ALL_POSTS", "SPECIFIC_POSTS", "FUTURE_POSTS"]),
  targetPostIds: z.array(z.string()).default([]),
  keywords: z
    .array(z.string().trim().min(1))
    .min(1, "Add at least one keyword"),
  matchType: z.enum(["EXACT", "CONTAINS", "ANY"]),
  caseSensitive: z.boolean().default(false),
  publicReplyVariations: z
    .array(z.string().trim().min(1))
    .min(1, "Add at least one public reply"),
  dmContentType: z.enum(["TEXT", "LINK", "BUTTON", "IMAGE", "VIDEO", "FILE", "PDF"]),
  dmBody: z.string().trim().min(1, "DM message body is required").max(2000),
  dmMediaUrl: z.string().trim().url().optional().or(z.literal("")),
  linkLabel: z.string().trim().optional().or(z.literal("")),
  linkDestinationUrl: z.string().trim().url().optional().or(z.literal("")),
  requiresEmailCapture: z.boolean().default(false),
  requiresFollow: z.boolean().default(false),
  tagIds: z.array(z.string()).default([]),
});

export type AutomationFormInput = z.infer<typeof automationFormSchema>;

export const PERSONALIZATION_TOKENS = [
  "{{first_name}}",
  "{{username}}",
  "{{email}}",
  "{{follower_count}}",
  "{{keyword}}",
  "{{post_name}}",
  "{{reel_name}}",
  "{{campaign}}",
] as const;
