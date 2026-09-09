// Data models and enums for AutoDM MongoDB backend

export type Platform =
  | "INSTAGRAM"
  | "WHATSAPP"
  | "MESSENGER"
  | "YOUTUBE"
  | "TELEGRAM"
  | "DISCORD"
  | "TIKTOK"
  | "LINKEDIN"
  | "X";

export type WorkspacePlan =
  | "FREE"
  | "DEMO"
  | "CREATOR"
  | "PRO"
  | "BUSINESS"
  | "AGENCY";

export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

export type MemberStatus = "ACTIVE" | "INVITED";

export type ConnectionMode = "DEMO" | "LIVE";

export type AccountStatus = "CONNECTED" | "DEMO" | "DISCONNECTED" | "ERROR";

export type PostType = "REEL" | "IMAGE" | "CAROUSEL" | "STORY";

export type AutomationStatus = "ACTIVE" | "PAUSED" | "DRAFT";

export type AutomationScope = "ALL_POSTS" | "SPECIFIC_POSTS" | "FUTURE_POSTS";

export type MatchType = "EXACT" | "CONTAINS" | "ANY";

export type ActionType = "PUBLIC_REPLY" | "SEND_DM";

export type DmContentType =
  | "TEXT"
  | "LINK"
  | "BUTTON"
  | "IMAGE"
  | "VIDEO"
  | "FILE"
  | "PDF";

export type RunStatus =
  | "TRIGGERED"
  | "REPLIED"
  | "DM_SENT"
  | "DM_DELIVERED"
  | "DM_FAILED"
  | "LINK_CLICKED"
  | "LEAD"
  | "CONVERTED";

export type ContactSource = "AUTODM" | "MANUAL" | "IMPORT";

export type LeadStatus =
  | "NEW"
  | "ENGAGED"
  | "QUALIFIED"
  | "CUSTOMER"
  | "REPEAT_CUSTOMER"
  | "LOST";

export type ConversionSource = "AUTODM" | "MANUAL";

export type MetricUnit = "COUNT" | "PERCENT" | "CURRENCY" | "SECONDS";

export type ConversationStatus = "OPEN" | "PENDING" | "CLOSED";

export type MessageDirection = "INBOUND" | "OUTBOUND";

export type MessageSenderType = "CONTACT" | "BOT" | "AGENT";

export type FlowNodeType =
  | "TRIGGER"
  | "MESSAGE"
  | "IMAGE"
  | "VIDEO"
  | "FILE"
  | "LINK"
  | "BUTTON"
  | "QUESTION"
  | "CONDITION"
  | "AI"
  | "DELAY"
  | "EMAIL_CAPTURE"
  | "FOLLOW_GATE"
  | "TAG"
  | "CRM"
  | "WEBHOOK"
  | "API"
  | "HUMAN_HANDOFF"
  | "END";

export type ProductType =
  | "PDF"
  | "EBOOK"
  | "TEMPLATE"
  | "VIDEO"
  | "AUDIO"
  | "ZIP"
  | "COURSE";

export type OrderStatus = "PENDING" | "PAID" | "REFUNDED" | "FAILED";

export type SubscriptionStatus = "ACTIVE" | "CANCELED" | "PAST_DUE";

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string | null;
  role: MemberRole;
  invitedEmail: string | null;
  status: MemberStatus;
  createdAt: Date;
  user?: User | null;
  workspace?: Workspace;
}

export interface SocialAccount {
  id: string;
  workspaceId: string;
  platform: Platform;
  externalAccountId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: AccountStatus;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
  connection?: PlatformConnection | null;
  profile?: Profile | null;
}

export interface PlatformConnection {
  id: string;
  socialAccountId: string;
  mode: ConnectionMode;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  scopes: string[];
  metaAppUserId: string | null;
  webhookVerifyToken: string | null;
  lastSyncedAt: Date | null;
  lastSyncStatus: string | null;
  lastErrorMessage: string | null;
  messagingTier: string | null;
  qualityRating: string | null;
  dailyMessageLimit: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  socialAccountId: string;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  bio: string | null;
  website: string | null;
  profileVisits30d: number;
  asOf: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowerSnapshot {
  id: string;
  socialAccountId: string;
  snapshotDate: Date;
  followersCount: number;
  followingCount: number;
  gained: number;
  lost: number;
  net: number;
  createdAt: Date;
}

export interface Post {
  id: string;
  socialAccountId: string;
  externalId: string;
  type: PostType;
  caption: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  contentMetrics: ContentMetric[];
  comments: Comment[];
  automationTargets: AutomationTargetPost[];
}

export interface ContentMetric {
  id: string;
  postId: string;
  metricDate: Date;
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
  createdAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  externalId: string;
  authorUsername: string;
  text: string;
  createdAtPlatform: Date;
  isFromAutomationReply: boolean;
  matchedAutomationId: string | null;
  createdAt: Date;
  post?: Post;
}

export interface Automation {
  id: string;
  workspaceId: string;
  socialAccountId: string;
  name: string;
  status: AutomationStatus;
  scope: AutomationScope;
  createdAt: Date;
  updatedAt: Date;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
  targetPosts: AutomationTargetPost[];
}

export interface AutomationTargetPost {
  id: string;
  automationId: string;
  postId: string;
  post?: Post;
  automation: { id: string; name: string };
}

export interface AutomationTrigger {
  id: string;
  automationId: string;
  keywordGroup: string[];
  matchType: MatchType;
  caseSensitive: boolean;
  createdAt: Date;
}

export interface AutomationAction {
  id: string;
  automationId: string;
  order: number;
  type: ActionType;
  publicReplyVariations: string[];
  dmContentType: DmContentType | null;
  dmBody: string | null;
  dmMediaUrl: string | null;
  linkId: string | null;
  requiresEmailCapture: boolean;
  requiresFollow: boolean;
  tagIdsToApply: string[];
  createdAt: Date;
  link: Link | null;
}

export interface AutomationRun {
  id: string;
  automationId: string;
  commentId: string | null;
  contactId: string | null;
  triggeredAt: Date;
  publicReplySentAt: Date | null;
  dmSentAt: Date | null;
  dmDeliveredAt: Date | null;
  dmOpenedAt: Date | null;
  linkClickedAt: Date | null;
  leadCapturedAt: Date | null;
  convertedAt: Date | null;
  revenueCents: number | null;
  status: RunStatus;
  createdAt: Date;
  automation?: Automation;
  comment: Comment | null;
  contact: Contact | null;
}

export interface Contact {
  id: string;
  workspaceId: string;
  socialAccountId: string | null;
  platformUsername: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  source: ContactSource;
  createdAt: Date;
  updatedAt: Date;
  tags: Array<ContactTag & { tag: Tag }>;
  socialAccount?: SocialAccount | null;
}

export interface ContactTag {
  id: string;
  contactId: string;
  tagId: string;
  tag: Tag;
}

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface Lead {
  id: string;
  workspaceId: string;
  contactId: string;
  automationId: string | null;
  sourceLinkId: string | null;
  capturedAt: Date;
  status: LeadStatus;
  createdAt: Date;
  contact: Contact;
  automation: Automation | null;
  sourceLink: Link | null;
  conversions: Conversion[];
}

export interface Link {
  id: string;
  workspaceId: string;
  campaignId: string | null;
  automationId: string | null;
  postId: string | null;
  label: string;
  destinationUrl: string;
  shortSlug: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  createdAt: Date;
  updatedAt: Date;
  automation: { id: string; name: string } | null;
}

export interface LinkClick {
  id: string;
  linkId: string;
  contactId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  referrer: string | null;
  country: string | null;
  isUniqueForContact: boolean;
  clickedAt: Date;
}

export interface Campaign {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversion {
  id: string;
  workspaceId: string;
  leadId: string;
  automationId: string | null;
  linkId: string | null;
  amountCents: number;
  currency: string;
  occurredAt: Date;
  source: ConversionSource;
  createdAt: Date;
}

export interface MetricSnapshot {
  id: string;
  workspaceId: string;
  metricName: string;
  value: number;
  unit: MetricUnit;
  timestamp: Date;
  platform: Platform;
  accountId: string | null;
  contentId: string | null;
  campaignId: string | null;
  automationId: string | null;
  createdAt: Date;
}

export interface Webhook {
  id: string;
  workspaceId: string;
  url: string;
  eventTypes: string[];
  secret: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  workspaceId: string;
  name: string;
  hashedKey: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  socialAccountId: string;
  contactId: string | null;
  platform: Platform;
  status: ConversationStatus;
  botPaused: boolean;
  assignedToUserId: string | null;
  lastMessageAt: Date;
  lastInboundAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contact: Contact | null;
  messages: Message[];
  assignedTo: User | null;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  senderType: MessageSenderType;
  body: string;
  mediaUrl: string | null;
  sentAt: Date;
  readAt: Date | null;
}

export interface Flow {
  id: string;
  workspaceId: string;
  automationId: string | null;
  name: string;
  status: AutomationStatus;
  createdAt: Date;
  updatedAt: Date;
  nodes: FlowNode[];
  edges: FlowEdge[];
  automation?: { id: string; name: string } | null;
  _count: { nodes: number; edges: number };
}

export interface FlowNode {
  id: string;
  flowId: string;
  type: FlowNodeType;
  positionX: number;
  positionY: number;
  data: unknown;
}

export interface FlowEdge {
  id: string;
  flowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}

export interface Product {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  type: ProductType;
  priceCents: number;
  currency: string;
  fileUrl: string | null;
  coverImageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  orders: Order[];
  _count: { orders: number };
}

export interface Order {
  id: string;
  workspaceId: string;
  productId: string;
  contactId: string | null;
  email: string;
  amountCents: number;
  currency: string;
  status: OrderStatus;
  createdAt: Date;
  product?: Product;
}

export interface BioPage {
  id: string;
  workspaceId: string;
  slug: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  theme: string;
  createdAt: Date;
  updatedAt: Date;
  links: BioLink[];
}

export interface BioLink {
  id: string;
  bioPageId: string;
  label: string;
  url: string;
  icon: string | null;
  order: number;
  clicks: number;
  bioPage: BioPage;
}

export interface Subscription {
  id: string;
  workspaceId: string;
  plan: WorkspacePlan;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type InputJsonValue = unknown;
export type AutomationRunWhereInput = Record<string, unknown>;
export type LeadWhereInput = Record<string, unknown>;
export type PostWhereInput = Record<string, unknown>;

