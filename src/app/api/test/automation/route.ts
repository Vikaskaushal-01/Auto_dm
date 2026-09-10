import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processIncomingComment } from "@/lib/automations/engine";

export async function GET() {
  const automations = await prisma.automation.findMany({
    where: { status: "ACTIVE" },
    include: {
      triggers: true,
      actions: true,
      socialAccount: true,
    },
  });

  return NextResponse.json({
    status: "ok",
    message: "AutoDM Automation Test Engine is operational.",
    activeAutomationsCount: automations.length,
    automations: automations.map((a) => ({
      id: a.id,
      name: a.name,
      platform: a.socialAccount.platform,
      accountUsername: a.socialAccount.username,
      keywords: a.triggers.flatMap((t) => t.keywordGroup),
      actionsCount: a.actions.length,
    })),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { commentText, authorUsername, automationId } = body;

    if (!commentText) {
      return NextResponse.json(
        { ok: false, error: "commentText is required" },
        { status: 400 },
      );
    }

    // Find target automation or first active automation
    const automation = automationId
      ? await prisma.automation.findUnique({
          where: { id: automationId },
          include: { socialAccount: true },
        })
      : await prisma.automation.findFirst({
          where: { status: "ACTIVE" },
          include: { socialAccount: true },
        });

    if (!automation) {
      return NextResponse.json(
        { ok: false, error: "No active automation found to test against." },
        { status: 404 },
      );
    }

    const testCommentId = `test_cmt_${Date.now()}`;
    const author = authorUsername || "test_follower_user";

    const result = await processIncomingComment({
      workspaceId: automation.workspaceId,
      socialAccountId: automation.socialAccountId,
      platform: automation.socialAccount.platform,
      commentId: testCommentId,
      commentText,
      authorUsername: author,
    });

    return NextResponse.json({
      ok: true,
      testedComment: commentText,
      testedUser: author,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Test failed" },
      { status: 500 },
    );
  }
}
