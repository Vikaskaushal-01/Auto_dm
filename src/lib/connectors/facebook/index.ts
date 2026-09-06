import { prisma } from "@/lib/prisma";
import { DemoFacebookConnector } from "./demo-connector";
import { GraphAPIFacebookConnector } from "./graph-connector";
import type { FacebookConnector } from "./types";

const demoConnector = new DemoFacebookConnector();
const graphConnector = new GraphAPIFacebookConnector();

export async function getFacebookConnector(socialAccountId: string): Promise<FacebookConnector> {
  const connection = await prisma.platformConnection.findUnique({
    where: { socialAccountId },
    select: { mode: true },
  });
  return connection?.mode === "LIVE" ? graphConnector : demoConnector;
}

export type {
  FacebookConnector,
  FacebookPageProfileDTO,
  FacebookPostDTO,
  FacebookPostTypeDTO,
  FacebookPostInsightsDTO,
  FacebookCommentDTO,
  SendMessengerInput,
  SendResultDTO,
  ConnectionStatusDTO,
  DateRange,
} from "./types";
