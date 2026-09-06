import type {
  ConnectionStatusDTO,
  DateRange,
  FacebookCommentDTO,
  FacebookConnector,
  FacebookPageProfileDTO,
  FacebookPostDTO,
  FacebookPostInsightsDTO,
  SendMessengerInput,
  SendResultDTO,
} from "./types";

/**
 * Real Facebook Graph API implementation — NOT wired up yet. Requires a
 * Meta app with Facebook Login for Business, the Page connected via OAuth,
 * and (for Messenger sends) the pages_messaging permission approved.
 *
 * Endpoint mapping for when this gets implemented:
 *   getPageProfile      -> GET /{page-id}?fields=name,fan_count,about,website,picture
 *   getPosts            -> GET /{page-id}/posts?fields=id,message,full_picture,permalink_url,created_time
 *   getPostInsights     -> GET /{post-id}/insights?metric=post_impressions,post_engaged_users
 *   getComments         -> GET /{post-id}/comments?fields=id,from,message,created_time
 *   sendMessengerMessage -> POST /{page-id}/messages (Send API)
 *   replyToComment      -> POST /{comment-id}/comments
 *   verifyConnection    -> GET /{page-id}?fields=id (checks token validity)
 */
export class GraphAPIFacebookConnector implements FacebookConnector {
  private notImplemented(method: string): never {
    throw new Error(
      `GraphAPIFacebookConnector.${method}() is not implemented yet. ` +
        "Connect a real Facebook Page via Meta OAuth (Settings > Integrations) " +
        "once META_APP_ID/META_APP_SECRET are configured.",
    );
  }

  getPageProfile(_accountId: string): Promise<FacebookPageProfileDTO> {
    this.notImplemented("getPageProfile");
  }
  getPosts(_accountId: string, _opts?: { since?: Date }): Promise<FacebookPostDTO[]> {
    this.notImplemented("getPosts");
  }
  getPostInsights(_postId: string, _range?: DateRange): Promise<FacebookPostInsightsDTO> {
    this.notImplemented("getPostInsights");
  }
  getComments(_postId: string, _opts?: { since?: Date }): Promise<FacebookCommentDTO[]> {
    this.notImplemented("getComments");
  }
  sendMessengerMessage(_input: SendMessengerInput): Promise<SendResultDTO> {
    this.notImplemented("sendMessengerMessage");
  }
  replyToComment(_commentId: string, _text: string): Promise<void> {
    this.notImplemented("replyToComment");
  }
  verifyConnection(_accountId: string): Promise<ConnectionStatusDTO> {
    this.notImplemented("verifyConnection");
  }
}
