export interface DateRange {
  start: Date;
  end: Date;
}

export interface InstagramProfileDTO {
  accountId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  bio: string | null;
  website: string | null;
}

export interface FollowerHistoryPointDTO {
  date: Date;
  followersCount: number;
  gained: number;
  lost: number;
  net: number;
}

export type PostTypeDTO = "REEL" | "IMAGE" | "CAROUSEL" | "STORY";

export interface PostDTO {
  id: string;
  externalId: string;
  type: PostTypeDTO;
  caption: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  publishedAt: Date;
}

export interface ReelInsightsDTO {
  postId: string;
  views: number;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watchTimeSeconds: number;
  engagementRate: number;
  profileVisits: number;
  followersGained: number;
  linkClicks: number;
}

export interface CommentDTO {
  id: string;
  externalId: string;
  authorUsername: string;
  text: string;
  createdAtPlatform: Date;
}

export interface SendDmInput {
  accountId: string;
  automationId: string;
  commentId?: string;
  toUsername: string;
  body: string;
  mediaUrl?: string;
  linkId?: string;
}

export interface SendDmResultDTO {
  automationRunId: string;
  status: "DM_SENT" | "DM_FAILED";
  sentAt: Date;
}

export interface ConnectionStatusDTO {
  ok: boolean;
  error?: string;
}

/**
 * Everything the app knows about "an Instagram account" goes through this
 * interface. DemoInstagramConnector implements it against seeded Postgres
 * data; GraphAPIInstagramConnector (stub) will implement it against the real
 * Meta Graph API once credentials are available. No other code should import
 * either implementation directly — always go through
 * `getInstagramConnector()` in ./index.ts so swapping demo->live later is a
 * one-line change, not a rewrite.
 */
export interface InstagramConnector {
  getProfile(accountId: string): Promise<InstagramProfileDTO>;
  getFollowerHistory(accountId: string, range: DateRange): Promise<FollowerHistoryPointDTO[]>;
  getPosts(
    accountId: string,
    opts?: { type?: PostTypeDTO; since?: Date },
  ): Promise<PostDTO[]>;
  getReelInsights(postId: string, range?: DateRange): Promise<ReelInsightsDTO>;
  getComments(postId: string, opts?: { since?: Date }): Promise<CommentDTO[]>;
  sendDirectMessage(input: SendDmInput): Promise<SendDmResultDTO>;
  replyToComment(commentId: string, text: string): Promise<void>;
  verifyConnection(accountId: string): Promise<ConnectionStatusDTO>;
}
