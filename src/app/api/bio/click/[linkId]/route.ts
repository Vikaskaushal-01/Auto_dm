import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await params;
  const link = await db.bioLink
    .update({
      where: { id: linkId },
      data: { clicks: { increment: 1 } },
    })
    .catch(() => null);

  if (!link) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.redirect(link.url);
}
