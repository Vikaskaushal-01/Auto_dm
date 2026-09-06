import type {
  CommentDTO,
  ConnectionStatusDTO,
  DateRange,
  FollowerHistoryPointDTO,
  InstagramConnector,
  InstagramProfileDTO,
  PostDTO,
  PostTypeDTO,
  ReelInsightsDTO,
  SendDmInput,
  SendDmResultDTO,
} from "./types";

/**
 * Real Instagram Graph API implementation — NOT wired up yet.
 *
 * Requires a Meta Developer App with Instagram Graph API access, App Review
 * for the relevant scopes (instagram_basic, instagram_manage_comments,
 * instagram_manage_messages, pages_show_list, etc.), and a completed OAuth
 * flow that populates PlatformConnection.{accessToken, refreshToken,
 * tokenExpiresAt, scopes, metaAppUserId} for the SocialAccount.
 *
 * Required env vars once credentials are available:
 *   META_APP_ID, META_APP_SECRET, META_REDIRECT_URI
 * (see .env.example)
 *
 * Endpoint mapping for when this gets implemented:
 *   getProfile          -> GET /{ig-user-id}?fields=username,followers_count,follows_count,media_count,biography,website
 *   getFollowerHistory  -> GET /{ig-user-id}/insights?metric=follower_count&period=day
 *   getPosts            -> GET /{ig-user-id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp
 *   getReelInsights     -> GET /{media-id}/insights?metric=plays,reach,likes,comments,shares,saved,ig_reels_avg_watch_time
 *   getComments         -> GET /{media-id}/comments?fields=id,username,text,timestamp
 *   sendDirectMessage   -> POST /{ig-user-id}/messages (Messaging API)
 *   replyToComment      -> POST /{comment-id}/replies
 *   verifyConnection    -> GET /{ig-user-id}?fields=id (checks token validity)
 */
export class GraphAPIInstagramConnector implements InstagramConnector {
  private notImplemented(method: string): never {
    throw new Error(
      `GraphAPIInstagramConnector.${method}() is not implemented yet. ` +
        "Connect a real Instagram account via Meta OAuth (Settings > Integrations) " +
        "once META_APP_ID/META_APP_SECRET are configured.",
    );
  }

  getProfile(_accountId: string): Promise<InstagramProfileDTO> {
    this.notImplemented("getProfile");
  }
  getFollowerHistory(_accountId: string, _range: DateRange): Promise<FollowerHistoryPointDTO[]> {
    this.notImplemented("getFollowerHistory");
  }
  getPosts(_accountId: string, _opts?: { type?: PostTypeDTO; since?: Date }): Promise<PostDTO[]> {
    this.notImplemented("getPosts");
  }
  getReelInsights(_postId: string, _range?: DateRange): Promise<ReelInsightsDTO> {
    this.notImplemented("getReelInsights");
  }
  getComments(_postId: string, _opts?: { since?: Date }): Promise<CommentDTO[]> {
    this.notImplemented("getComments");
  }
  sendDirectMessage(_input: SendDmInput): Promise<SendDmResultDTO> {
    this.notImplemented("sendDirectMessage");
  }
  replyToComment(_commentId: string, _text: string): Promise<void> {
    this.notImplemented("replyToComment");
  }
  verifyConnection(_accountId: string): Promise<ConnectionStatusDTO> {
    this.notImplemented("verifyConnection");
  }
}
