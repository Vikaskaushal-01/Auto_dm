import { GraphAPIInstagramConnector } from "./graph-connector";
import type { InstagramConnector } from "./types";

const graphConnector = new GraphAPIInstagramConnector();

/**
 * Single factory for the Instagram connector. Routes to the real Meta Graph API
 * connector, fetching live from Meta Graph API when tokens exist or reading
 * from the database cache.
 */
export async function getInstagramConnector(_socialAccountId?: string): Promise<InstagramConnector> {
  return graphConnector;
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
