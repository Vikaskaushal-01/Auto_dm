import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { processIncomingComment } from "@/lib/automations/engine";

interface WebhookEntryChange {
  field?: string;
  value?: {
    id?: string;
    text?: string;
    item?: string;
    post_id?: string;
    comment_id?: string;
    message?: string;
    from?: { id?: string; username?: string; name?: string };
    media?: { id?: string };
    contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
    messages?: Array<{ id?: string; text?: { body?: string } }>;
  };
}

interface WebhookEntry {
  id?: string;
  changes?: WebhookEntryChange[];
}

interface WebhookPayload {
  object?: string;
  entry?: WebhookEntry[];
}

/**
 * Meta Webhook verification handshake (GET).
 * Meta tests this endpoint when setting up Webhooks in developers.facebook.com.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === expectedToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * Verifies the Meta HMAC-SHA256 signature against the raw request body.
 */
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true; // if secret is not configured in dev, skip
  if (!signatureHeader) return false;

  const parts = signatureHeader.split("sha256=");
  const expectedHash = parts[1];
  if (!expectedHash) return false;

  const hmac = createHmac("sha256", secret);
  hmac.update(rawBody);
  const calculatedHash = hmac.digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(calculatedHash, "hex"));
  } catch {
    return false;
  }
}

/**
 * Handles incoming real-time events from Instagram, Facebook Pages, and WhatsApp.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifySignature(rawBody, signature)) {
    console.warn("Rejected webhook call: invalid HMAC signature");
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { object, entry } = payload;
  if (!entry || !Array.isArray(entry)) {
    return new Response("OK", { status: 200 });
  }

  try {
    for (const item of entry) {
      const externalAccountId = item.id;

      // 1. Instagram Events
      if (object === "instagram") {
        const changes = item.changes ?? [];
        for (const change of changes) {
          if (change.field === "comments" && change.value) {
            const commentValue = change.value;
            const commentId = commentValue.id;
            if (!commentId) continue;
            const text = commentValue.text ?? "";
            const author = commentValue.from?.username ?? "unknown";
            const mediaId = commentValue.media?.id;

            // Find matching connected SocialAccount
            const account = await prisma.socialAccount.findFirst({
              where: {
                platform: "INSTAGRAM",
                externalAccountId,
              },
            });

            if (account) {
              await processIncomingComment({
                workspaceId: account.workspaceId,
                socialAccountId: account.id,
                platform: "INSTAGRAM",
                postId: mediaId,
                commentId,
                commentText: text,
                authorUsername: author,
              });
            }
          }
        }
      }

      // 2. Facebook Page Events
      if (object === "page") {
        const changes = item.changes ?? [];
        for (const change of changes) {
          if (change.field === "feed" && change.value) {
            const feedValue = change.value;
            if (feedValue.item === "comment" && feedValue.comment_id) {
              const account = await prisma.socialAccount.findFirst({
                where: { platform: "MESSENGER", externalAccountId },
              });

              if (account) {
                await processIncomingComment({
                  workspaceId: account.workspaceId,
                  socialAccountId: account.id,
                  platform: "MESSENGER",
                  postId: feedValue.post_id,
                  commentId: feedValue.comment_id,
                  commentText: feedValue.message ?? "",
                  authorUsername: feedValue.from?.name ?? "User",
                });
              }
            }
          }
        }
      }

      // 3. WhatsApp Business Account Events
      if (object === "whatsapp_business_account") {
        const changes = item.changes ?? [];
        for (const change of changes) {
          if (change.field === "messages" && change.value) {
            const val = change.value;
            const contactPhone = val.contacts?.[0]?.wa_id;
            const contactName = val.contacts?.[0]?.profile?.name;
            const msg = val.messages?.[0];

            if (msg && contactPhone) {
              const account = await prisma.socialAccount.findFirst({
                where: { platform: "WHATSAPP" },
              });

              if (account) {
                // Upsert Contact
                const contact = await prisma.contact.upsert({
                  where: { id: `wa_contact_${account.id}_${contactPhone}` },
                  update: { phone: contactPhone },
                  create: {
                    id: `wa_contact_${account.id}_${contactPhone}`,
                    workspaceId: account.workspaceId,
                    socialAccountId: account.id,
                    phone: contactPhone,
                    firstName: contactName ?? contactPhone,
                    platformUsername: contactPhone,
                  },
                });

                // Upsert Conversation
                const conversation = await prisma.conversation.upsert({
                  where: { id: `wa_conv_${account.id}_${contact.id}` },
                  update: {
                    lastMessageAt: new Date(),
                    lastInboundAt: new Date(),
                  },
                  create: {
                    id: `wa_conv_${account.id}_${contact.id}`,
                    workspaceId: account.workspaceId,
                    socialAccountId: account.id,
                    contactId: contact.id,
                    platform: "WHATSAPP",
                    lastMessageAt: new Date(),
                    lastInboundAt: new Date(),
                  },
                });

                // Add Inbound Message
                await prisma.message.create({
                  data: {
                    conversationId: conversation.id,
                    direction: "INBOUND",
                    senderType: "CONTACT",
                    body: msg.text?.body ?? "[Attachment]",
                  },
                });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Error processing Meta webhook event:", err);
  }

  return new Response("OK", { status: 200 });
}
