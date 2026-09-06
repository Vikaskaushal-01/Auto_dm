/**
 * Facebook Pages + Messenger share the same Graph API family as Instagram
 * and the same comment-to-DM automation shape (Page post comment -> keyword
 * match -> Messenger DM), so this interface intentionally mirrors
 * InstagramConnector's rather than reinventing it. The real difference from
 * Instagram is Messenger's own 24-hour standard messaging window (with a
 * few tag-based exceptions Meta grants for specific message types) —
 * modeled the same way as WhatsApp's window via Conversation.lastInboundAt.
 */

export interface DateRange {
  start: Date;
  end: Date;
}

export interface FacebookPageProfileDTO {
  accountId: string;
  pageName: string;
  avatarUrl: string | null;
  followersCount: number;
  about: string | null;
  website: string | null;
}

export type FacebookPostTypeDTO = "POST" | "VIDEO" | "PHOTO" | "LINK";

export interface FacebookPostDTO {
  id: string;
  externalId: string;
  type: FacebookPostTypeDTO;
  message: string | null;
  mediaUrl: string | null;
  permalink: string | null;
  publishedAt: Date;
}

export interface FacebookPostInsightsDTO {
  postId: string;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

export interface FacebookCommentDTO {
  id: string;
  externalId: string;
  authorName: string;
  text: string;
  createdAtPlatform: Date;
}

export interface SendMessengerInput {
  accountId: string;
  automationId: string;
  commentId?: string;
  body: string;
}

export interface SendResultDTO {
  automationRunId: string;
  status: "DM_SENT" | "DM_FAILED";
  sentAt: Date;
}

export interface ConnectionStatusDTO {
  ok: boolean;
  error?: string;
}

export interface FacebookConnector {
  getPageProfile(accountId: string): Promise<FacebookPageProfileDTO>;
  getPosts(accountId: string, opts?: { since?: Date }): Promise<FacebookPostDTO[]>;
  getPostInsights(postId: string, range?: DateRange): Promise<FacebookPostInsightsDTO>;
  getComments(postId: string, opts?: { since?: Date }): Promise<FacebookCommentDTO[]>;
  sendMessengerMessage(input: SendMessengerInput): Promise<SendResultDTO>;
  replyToComment(commentId: string, text: string): Promise<void>;
  verifyConnection(accountId: string): Promise<ConnectionStatusDTO>;
}
