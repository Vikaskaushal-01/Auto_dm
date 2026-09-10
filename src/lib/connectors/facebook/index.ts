import { GraphAPIFacebookConnector } from "./graph-connector";
import type { FacebookConnector } from "./types";

const graphConnector = new GraphAPIFacebookConnector();

/**
 * Single factory for the Facebook connector. Routes to the real Meta Graph API
 * connector for live Facebook Pages and Messenger automation.
 */
export async function getFacebookConnector(_socialAccountId?: string): Promise<FacebookConnector> {
  return graphConnector;
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
