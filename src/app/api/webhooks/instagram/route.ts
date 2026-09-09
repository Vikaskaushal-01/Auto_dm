import { NextRequest, NextResponse } from "next/server";
import { processInstagramComment } from "@/lib/automations/executor";

/**
 * GET: Webhook Verification for Meta Developer Platform
 * When you configure a Webhook URL in Meta App Dashboard, Meta sends a GET request
 * with hub.mode, hub.challenge, and hub.verify_token to verify the endpoint.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "autodm_verify_token_123";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[Webhook] Instagram webhook verification successful!");
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[Webhook] Verification token mismatch or invalid mode:", { mode, token });
  return new Response("Forbidden: Verification token mismatch", { status: 403 });
}

/**
 * POST: Handles incoming Instagram Comment & Messaging Webhooks from Meta
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log("[Webhook] Received Instagram webhook event:", JSON.stringify(payload));

    if (payload.object === "instagram" || payload.object === "page") {
      const entries = payload.entry || [];

      for (const entry of entries) {
        // 1. Process Instagram Comment changes
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            const isComment =
              change.field === "comments" ||
              change.field === "comment" ||
              (change.field === "feed" && (change.value?.item === "comment" || change.value?.comment_id));

            if (isComment && change.value) {
              const val = change.value;
              const commentId = val.id || val.comment_id;
              const text = val.text || val.message || "";
              const commenterUsername = val.from?.username || val.from?.name || "instagram_user";
              const commenterId = val.from?.id;
              const mediaId = val.media?.id || val.post_id || val.media_id || entry.id;
              const timestamp = val.created_time ? new Date(val.created_time * 1000) : new Date();

              console.log(`[Webhook] Extracted comment: "${text}" from @${commenterUsername} on media ${mediaId} (commentId: ${commentId})`);

              // Asynchronously trigger the automation runner
              processInstagramComment({
                externalCommentId: commentId,
                text,
                commenterUsername,
                commenterId,
                mediaExternalId: mediaId,
                timestamp,
              }).catch((err) => {
                console.error("[Webhook] Error executing comment automation:", err);
              });
            } else {
              console.log(`[Webhook] Unhandled change field: ${change.field}`);
            }
          }
        }

        // 2. Process Instagram Messaging events (if any)
        if (entry.messaging && Array.isArray(entry.messaging)) {
          for (const msgEvent of entry.messaging) {
            console.log("[Webhook] Messaging event received:", msgEvent);
          }
        }
      }

      // Always return 200 OK immediately to satisfy Meta's webhook timeout requirement
      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    return NextResponse.json({ status: "IGNORED_OBJECT" }, { status: 200 });
  } catch (error: any) {
    console.error("[Webhook] Error processing incoming webhook:", error);
    // Still return 200 so Meta does not repeatedly retry corrupt payloads
    return NextResponse.json({ status: "ERROR_HANDLED", message: error?.message }, { status: 200 });
  }
}
