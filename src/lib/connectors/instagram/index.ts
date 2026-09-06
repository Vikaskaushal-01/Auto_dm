import { prisma } from "@/lib/prisma";
import { DemoInstagramConnector } from "./demo-connector";
import { GraphAPIInstagramConnector } from "./graph-connector";
import type { InstagramConnector } from "./types";

const demoConnector = new DemoInstagramConnector();
const graphConnector = new GraphAPIInstagramConnector();

/**
 * Single point where the app decides demo vs. live Instagram data. Never
 * import DemoInstagramConnector/GraphAPIInstagramConnector directly — go
 * through this factory so wiring up real Meta credentials later is a
 * one-line change (PlatformConnection.mode flips from DEMO to LIVE).
 */
export async function getInstagramConnector(socialAccountId: string): Promise<InstagramConnector> {
  const connection = await prisma.platformConnection.findUnique({
    where: { socialAccountId },
    select: { mode: true },
  });

  return connection?.mode === "LIVE" ? graphConnector : demoConnector;
}

export type {
  InstagramConnector,
  InstagramProfileDTO,
  FollowerHistoryPointDTO,
  PostDTO,
  PostTypeDTO,
  ReelInsightsDTO,
  CommentDTO,
  SendDmInput,
  SendDmResultDTO,
  ConnectionStatusDTO,
  DateRange,
} from "./types";
