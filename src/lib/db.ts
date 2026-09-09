import { MongoClient, type Db, type Document, type Filter, type SortDirection } from "mongodb";
import crypto from "crypto";
import type {
  User,
  Workspace,
  WorkspaceMember,
  SocialAccount,
  PlatformConnection,
  Profile,
  FollowerSnapshot,
  Post,
  ContentMetric,
  Comment,
  Automation,
  AutomationTargetPost,
  AutomationTrigger,
  AutomationAction,
  AutomationRun,
  Contact,
  ContactTag,
  Tag,
  Lead,
  Link,
  LinkClick,
  Campaign,
  Conversion,
  MetricSnapshot,
  Webhook,
  ApiKey,
  AuditLog,
  Conversation,
  Message,
  Flow,
  FlowNode,
  FlowEdge,
  Product,
  Order,
  BioPage,
  BioLink,
  Subscription,
} from "@/types/models";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/autodm";

const globalForDb = globalThis as unknown as {
  mongoClient: MongoClient | undefined;
  dbInstance: AutoDmDatabase | undefined;
};

let client: MongoClient;
if (process.env.NODE_ENV === "production") {
  client = new MongoClient(uri);
} else {
  if (!globalForDb.mongoClient) {
    globalForDb.mongoClient = new MongoClient(uri);
  }
  client = globalForDb.mongoClient;
}

let connectedDb: Db | null = null;
async function getDb(): Promise<Db> {
  if (!connectedDb) {
    await client.connect();
    connectedDb = client.db();
  }
  return connectedDb;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMongoFilter(where?: Record<string, unknown>): Filter<Document> {
  if (!where || Object.keys(where).length === 0) return {};
  const filter: Filter<Document> = {};

  for (const [key, val] of Object.entries(where)) {
    if (val === undefined) continue;

    // Handle compound unique keys
    if (
      key.includes("_") &&
      val &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      !(val instanceof Date)
    ) {
      const sub = val as Record<string, unknown>;
      for (const [subK, subV] of Object.entries(sub)) {
        filter[subK] = subV;
      }
      continue;
    }

    if (val === null) {
      filter[key] = null;
    } else if (val instanceof Date) {
      filter[key] = val;
    } else if (typeof val === "object" && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>;
      const opObj: Record<string, unknown> = {};
      let hasOp = false;

      if ("not" in obj) {
        hasOp = true;
        if (obj.not === null) {
          opObj["$ne"] = null;
        } else {
          opObj["$ne"] = obj.not;
        }
      }
      if ("in" in obj) {
        hasOp = true;
        opObj["$in"] = obj.in;
      }
      if ("notIn" in obj) {
        hasOp = true;
        opObj["$nin"] = obj.notIn;
      }
      if ("gte" in obj) {
        hasOp = true;
        opObj["$gte"] = obj.gte;
      }
      if ("lte" in obj) {
        hasOp = true;
        opObj["$lte"] = obj.lte;
      }
      if ("gt" in obj) {
        hasOp = true;
        opObj["$gt"] = obj.gt;
      }
      if ("lt" in obj) {
        hasOp = true;
        opObj["$lt"] = obj.lt;
      }
      if ("contains" in obj) {
        hasOp = true;
        opObj["$regex"] = escapeRegex(String(obj.contains));
        if (obj.mode === "insensitive") {
          opObj["$options"] = "i";
        }
      }
      if ("startsWith" in obj) {
        hasOp = true;
        opObj["$regex"] = `^${escapeRegex(String(obj.startsWith))}`;
        opObj["$options"] = "i";
      }

      if (hasOp) {
        filter[key] = opObj;
      } else {
        // Flatten nested relation object (e.g. bioPage: { workspaceId: "..." })
        for (const [subK, subV] of Object.entries(obj)) {
          filter[`${key}.${subK}`] = subV;
        }
      }
    } else {
      filter[key] = val;
    }
  }

  return filter;
}

function buildSort(orderBy?: unknown): Record<string, SortDirection> {
  if (!orderBy) return {};
  const sort: Record<string, SortDirection> = {};
  if (Array.isArray(orderBy)) {
    for (const item of orderBy) {
      if (typeof item === "object" && item !== null) {
        for (const [k, v] of Object.entries(item)) {
          sort[k] = v === "desc" || v === -1 ? -1 : 1;
        }
      }
    }
  } else if (typeof orderBy === "object" && orderBy !== null) {
    for (const [k, v] of Object.entries(orderBy)) {
      sort[k] = v === "desc" || v === -1 ? -1 : 1;
    }
  }
  return sort;
}

export class CollectionModel<T extends { id?: string } = any> {
  constructor(
    public readonly collectionName: string,
    private readonly dbProvider: () => Promise<Db>,
    private readonly allCollectionsProvider: () => AutoDmDatabase,
  ) {}

  private async getCol() {
    const db = await this.dbProvider();
    return db.collection(this.collectionName);
  }

  private async resolveWhereRelations(where?: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    if (!where) return undefined;
    const db = this.allCollectionsProvider();
    const resolved: Record<string, unknown> = { ...where };

    if (resolved.automation && typeof resolved.automation === "object" && !Array.isArray(resolved.automation)) {
      const automations = await db.automation.findMany({ where: resolved.automation as Record<string, unknown> });
      const ids = automations.map((a) => a.id);
      delete resolved.automation;
      resolved.automationId = { in: ids };
    }

    if (resolved.bioPage && typeof resolved.bioPage === "object" && !Array.isArray(resolved.bioPage)) {
      const pages = await db.bioPage.findMany({ where: resolved.bioPage as Record<string, unknown> });
      const ids = pages.map((p) => p.id);
      delete resolved.bioPage;
      resolved.bioPageId = { in: ids };
    }

    if (resolved.comment && typeof resolved.comment === "object" && !Array.isArray(resolved.comment)) {
      const comments = await db.comment.findMany({ where: resolved.comment as Record<string, unknown> });
      const ids = comments.map((c) => c.id);
      delete resolved.comment;
      resolved.commentId = { in: ids };
    }

    if (resolved.contact && typeof resolved.contact === "object" && !Array.isArray(resolved.contact)) {
      const contacts = await db.contact.findMany({ where: resolved.contact as Record<string, unknown> });
      const ids = contacts.map((c) => c.id);
      delete resolved.contact;
      resolved.contactId = { in: ids };
    }

    return resolved;
  }

  async findUnique(options: {
    where: Record<string, unknown>;
    select?: Record<string, boolean>;
    include?: Record<string, unknown>;
  }): Promise<T | null> {
    const col = await this.getCol();
    const resolvedWhere = await this.resolveWhereRelations(options.where);
    const filter = buildMongoFilter(resolvedWhere);
    const doc = await col.findOne(filter);
    if (!doc) return null;
    return this.applyIncludeAndSelect(doc as unknown as T, options.include, options.select);
  }

  async findUniqueOrThrow(options: {
    where: Record<string, unknown>;
    select?: Record<string, boolean>;
    include?: Record<string, unknown>;
  }): Promise<T> {
    const res = await this.findUnique(options);
    if (!res) {
      throw new Error(`Record not found in ${this.collectionName} for ${JSON.stringify(options.where)}`);
    }
    return res;
  }

  async findFirst(options?: {
    where?: Record<string, unknown>;
    orderBy?: unknown;
    select?: Record<string, boolean>;
    include?: Record<string, unknown>;
  }): Promise<T | null> {
    const col = await this.getCol();
    const resolvedWhere = await this.resolveWhereRelations(options?.where);
    const filter = buildMongoFilter(resolvedWhere);
    const sort = buildSort(options?.orderBy);

    const doc = await col.find(filter).sort(sort).limit(1).next();
    if (!doc) return null;
    return this.applyIncludeAndSelect(doc as unknown as T, options?.include, options?.select);
  }

  async findFirstOrThrow(options?: {
    where?: Record<string, unknown>;
    orderBy?: unknown;
    select?: Record<string, boolean>;
    include?: Record<string, unknown>;
  }): Promise<T> {
    const res = await this.findFirst(options);
    if (!res) {
      throw new Error(`Record not found in ${this.collectionName}`);
    }
    return res;
  }

  async findMany(options?: {
    where?: Record<string, unknown>;
    orderBy?: unknown;
    take?: number;
    skip?: number;
    select?: Record<string, boolean>;
    include?: Record<string, unknown>;
  }): Promise<T[]> {
    const col = await this.getCol();
    const resolvedWhere = await this.resolveWhereRelations(options?.where);
    const filter = buildMongoFilter(resolvedWhere);
    const sort = buildSort(options?.orderBy);

    let cursor = col.find(filter).sort(sort);
    if (options?.skip && options.skip > 0) {
      cursor = cursor.skip(options.skip);
    }
    if (options?.take && options.take > 0) {
      cursor = cursor.limit(options.take);
    }

    const docs = await cursor.toArray();
    return Promise.all(
      docs.map((d) =>
        this.applyIncludeAndSelect(d as unknown as T, options?.include, options?.select),
      ),
    );
  }

  async create(options: {
    data: Record<string, unknown>;
    select?: Record<string, boolean>;
    include?: Record<string, unknown>;
  }): Promise<T> {
    const col = await this.getCol();
    const id = (options.data.id as string) || crypto.randomUUID();
    const now = new Date();

    const docData: Record<string, unknown> = {
      ...options.data,
      id,
      createdAt: (options.data.createdAt as Date) || now,
      updatedAt: (options.data.updatedAt as Date) || now,
    };

    const nestedOps: Array<Promise<unknown>> = [];
    const db = this.allCollectionsProvider();

    if (this.collectionName === "flows" && docData.nodes && typeof docData.nodes === "object") {
      const nodesObj = docData.nodes as { create?: Array<Record<string, unknown>> };
      if (Array.isArray(nodesObj.create)) {
        for (const n of nodesObj.create) {
          nestedOps.push(db.flowNode.create({ data: { ...n, flowId: id } }));
        }
      }
      delete docData.nodes;
    }

    await col.insertOne(docData);
    await Promise.all(nestedOps);

    return this.applyIncludeAndSelect(docData as unknown as T, options.include, options.select);
  }

  async createMany(options: { data: Array<Record<string, unknown>> }): Promise<{ count: number }> {
    if (!options.data || options.data.length === 0) return { count: 0 };
    const col = await this.getCol();
    const now = new Date();

    const docs = options.data.map((item) => ({
      ...item,
      id: (item.id as string) || crypto.randomUUID(),
      createdAt: (item.createdAt as Date) || now,
      updatedAt: (item.updatedAt as Date) || now,
    }));

    const result = await col.insertMany(docs);
    return { count: result.insertedCount };
  }

  async createManyAndReturn(options: { data: Array<Record<string, unknown>> }): Promise<T[]> {
    if (!options.data || options.data.length === 0) return [];
    const col = await this.getCol();
    const now = new Date();

    const docs = options.data.map((item) => ({
      ...item,
      id: (item.id as string) || crypto.randomUUID(),
      createdAt: (item.createdAt as Date) || now,
      updatedAt: (item.updatedAt as Date) || now,
    }));

    await col.insertMany(docs);
    return docs as unknown as T[];
  }

  async update(options: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
    select?: Record<string, boolean>;
    include?: Record<string, unknown>;
  }): Promise<T> {
    const col = await this.getCol();
    const filter = buildMongoFilter(options.where);
    const now = new Date();

    const updateData: Record<string, unknown> = {
      ...options.data,
      updatedAt: (options.data.updatedAt as Date) || now,
    };

    const setFields: Record<string, unknown> = {};
    const incFields: Record<string, number> = {};

    for (const [k, v] of Object.entries(updateData)) {
      if (v && typeof v === "object" && "increment" in (v as Record<string, unknown>)) {
        incFields[k] = Number((v as { increment: number }).increment);
      } else {
        setFields[k] = v;
      }
    }

    const updateQuery: Record<string, unknown> = {};
    if (Object.keys(setFields).length > 0) updateQuery["$set"] = setFields;
    if (Object.keys(incFields).length > 0) updateQuery["$inc"] = incFields;

    await col.updateOne(filter, updateQuery);
    const updated = await col.findOne(filter);
    if (!updated) {
      throw new Error(`Record not found to update in ${this.collectionName}`);
    }
    return this.applyIncludeAndSelect(updated as unknown as T, options.include, options.select);
  }

  async updateMany(options: {
    where?: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }> {
    const col = await this.getCol();
    const resolvedWhere = await this.resolveWhereRelations(options?.where);
    const filter = buildMongoFilter(resolvedWhere);
    const now = new Date();

    const setFields: Record<string, unknown> = {
      ...options.data,
      updatedAt: (options.data.updatedAt as Date) || now,
    };

    const res = await col.updateMany(filter, { $set: setFields });
    return { count: res.modifiedCount };
  }

  async upsert(options: {
    where: Record<string, unknown>;
    update: Record<string, unknown>;
    create: Record<string, unknown>;
    select?: Record<string, boolean>;
    include?: Record<string, unknown>;
  }): Promise<T> {
    const existing = await this.findFirst({ where: options.where });
    if (existing) {
      return this.update({
        where: options.where,
        data: options.update,
        select: options.select,
        include: options.include,
      });
    } else {
      return this.create({
        data: { ...options.create, ...options.where },
        select: options.select,
        include: options.include,
      });
    }
  }

  async delete(options: { where: Record<string, unknown> }): Promise<T | null> {
    const col = await this.getCol();
    const resolvedWhere = await this.resolveWhereRelations(options.where);
    const filter = buildMongoFilter(resolvedWhere);
    const doc = await col.findOne(filter);
    if (!doc) return null;
    await col.deleteOne(filter);
    return doc as unknown as T;
  }

  async deleteMany(options?: { where?: Record<string, unknown> }): Promise<{ count: number }> {
    const col = await this.getCol();
    const resolvedWhere = await this.resolveWhereRelations(options?.where);
    const filter = buildMongoFilter(resolvedWhere);
    const res = await col.deleteMany(filter);
    return { count: res.deletedCount };
  }

  async count(options?: { where?: Record<string, unknown> }): Promise<number> {
    const col = await this.getCol();
    const resolvedWhere = await this.resolveWhereRelations(options?.where);
    const filter = buildMongoFilter(resolvedWhere);
    return col.countDocuments(filter);
  }

  async aggregate(options: {
    where?: Record<string, unknown>;
    _sum?: Record<string, boolean>;
    _avg?: Record<string, boolean>;
    _count?: boolean | Record<string, boolean>;
  }): Promise<{
    _sum: Record<string, number | null>;
    _avg: Record<string, number | null>;
    _count: number;
  }> {
    const col = await this.getCol();
    const resolvedWhere = await this.resolveWhereRelations(options.where);
    const filter = buildMongoFilter(resolvedWhere);

    const groupObj: Record<string, unknown> = { _id: null };
    if (options._sum) {
      for (const field of Object.keys(options._sum)) {
        groupObj[`sum_${field}`] = { $sum: `$${field}` };
      }
    }
    if (options._avg) {
      for (const field of Object.keys(options._avg)) {
        groupObj[`avg_${field}`] = { $avg: `$${field}` };
      }
    }
    groupObj["count"] = { $sum: 1 };

    const pipeline = [{ $match: filter }, { $group: groupObj }];
    const results = await col.aggregate(pipeline).toArray();
    const res = results[0] || {};

    const sumMap: Record<string, number | null> = {};
    if (options._sum) {
      for (const field of Object.keys(options._sum)) {
        sumMap[field] = res[`sum_${field}`] ?? 0;
      }
    }

    const avgMap: Record<string, number | null> = {};
    if (options._avg) {
      for (const field of Object.keys(options._avg)) {
        avgMap[field] = res[`avg_${field}`] ?? 0;
      }
    }

    return {
      _sum: sumMap,
      _avg: avgMap,
      _count: res["count"] ?? 0,
    };
  }

  async groupBy(options: {
    by: string[];
    where?: Record<string, unknown>;
    _count?: Record<string, boolean>;
    _sum?: Record<string, boolean>;
  }): Promise<Array<Record<string, unknown> & { _count: Record<string, number> }>> {
    const col = await this.getCol();
    const resolvedWhere = await this.resolveWhereRelations(options.where);
    const filter = buildMongoFilter(resolvedWhere);

    const groupFields: Record<string, string> = {};
    for (const b of options.by) {
      groupFields[b] = `$${b}`;
    }

    const groupObj: Record<string, unknown> = { _id: groupFields };
    if (options._count) {
      for (const k of Object.keys(options._count)) {
        groupObj[`count_${k}`] = { $sum: 1 };
      }
    }

    const pipeline = [{ $match: filter }, { $group: groupObj }];
    const rows = await col.aggregate(pipeline).toArray();

    return rows.map((r) => {
      const item: Record<string, unknown> & { _count: Record<string, number> } = {
        ...(r._id as Record<string, unknown>),
        _count: { _all: 0 },
      };
      if (options._count) {
        for (const k of Object.keys(options._count)) {
          item._count[k] = (r[`count_${k}`] as number) ?? 0;
        }
      }
      return item;
    });
  }

  private async applyIncludeAndSelect(
    doc: T,
    include?: Record<string, unknown>,
    select?: Record<string, boolean>,
  ): Promise<T> {
    const db = this.allCollectionsProvider();
    const result: Record<string, unknown> = { ...doc };

    if (include) {
      for (const [relKey, relConfig] of Object.entries(include)) {
        if (!relConfig) continue;

        if (relKey === "user" && "userId" in doc && doc.userId) {
          result.user = await db.user.findUnique({
            where: { id: doc.userId as string },
            select: typeof relConfig === "object" && (relConfig as { select?: Record<string, boolean> }).select
              ? (relConfig as { select: Record<string, boolean> }).select
              : undefined,
          });
        } else if (relKey === "profile" && "id" in doc) {
          result.profile = await db.profile.findFirst({
            where: { socialAccountId: doc.id as string },
          });
        } else if (relKey === "connection" && "id" in doc) {
          result.connection = await db.platformConnection.findFirst({
            where: { socialAccountId: doc.id as string },
          });
        } else if (relKey === "triggers" && "id" in doc) {
          result.triggers = await db.automationTrigger.findMany({
            where: { automationId: doc.id as string },
          });
        } else if (relKey === "actions" && "id" in doc) {
          result.actions = await db.automationAction.findMany({
            where: { automationId: doc.id as string },
            orderBy: (relConfig as { orderBy?: unknown }).orderBy || { order: "asc" },
            include: (relConfig as { include?: Record<string, unknown> }).include,
          });
        } else if (relKey === "link" && "linkId" in doc && doc.linkId) {
          result.link = await db.link.findUnique({
            where: { id: doc.linkId as string },
          });
        } else if (relKey === "links" && "id" in doc) {
          result.links = await db.bioLink.findMany({
            where: { bioPageId: doc.id as string },
            orderBy: (relConfig as { orderBy?: unknown }).orderBy || { order: "asc" },
          });
        } else if (relKey === "bioPage" && "bioPageId" in doc && doc.bioPageId) {
          result.bioPage = await db.bioPage.findUnique({
            where: { id: doc.bioPageId as string },
            include: (relConfig as { include?: Record<string, unknown> }).include,
          });
        } else if (relKey === "contact" && "contactId" in doc && doc.contactId) {
          result.contact = await db.contact.findUnique({
            where: { id: doc.contactId as string },
            include: (relConfig as { include?: Record<string, unknown> }).include,
          });
        } else if (relKey === "messages" && "id" in doc) {
          result.messages = await db.message.findMany({
            where: { conversationId: doc.id as string },
            orderBy: (relConfig as { orderBy?: unknown }).orderBy || { sentAt: "asc" },
          });
        } else if (relKey === "nodes" && "id" in doc) {
          result.nodes = await db.flowNode.findMany({
            where: { flowId: doc.id as string },
          });
        } else if (relKey === "edges" && "id" in doc) {
          result.edges = await db.flowEdge.findMany({
            where: { flowId: doc.id as string },
          });
        } else if (relKey === "tags" && "id" in doc) {
          result.tags = await db.contactTag.findMany({
            where: { contactId: doc.id as string },
            include: { tag: true },
          });
        } else if (relKey === "tag" && "tagId" in doc && doc.tagId) {
          result.tag = await db.tag.findUnique({
            where: { id: doc.tagId as string },
          });
        } else if (relKey === "automation" && "automationId" in doc && doc.automationId) {
          result.automation = await db.automation.findUnique({
            where: { id: doc.automationId as string },
            select: typeof relConfig === "object" && (relConfig as { select?: Record<string, boolean> }).select
              ? (relConfig as { select: Record<string, boolean> }).select
              : undefined,
          });
        } else if (relKey === "comment" && "commentId" in doc && doc.commentId) {
          result.comment = await db.comment.findUnique({
            where: { id: doc.commentId as string },
            select: typeof relConfig === "object" && (relConfig as { select?: Record<string, boolean> }).select
              ? (relConfig as { select: Record<string, boolean> }).select
              : undefined,
          });
        } else if (relKey === "orders" && "id" in doc) {
          result.orders = await db.order.findMany({
            where: { productId: doc.id as string },
            orderBy: (relConfig as { orderBy?: unknown }).orderBy || { createdAt: "desc" },
            take: (relConfig as { take?: number }).take,
          });
        } else if (relKey === "contentMetrics" && "id" in doc) {
          const filter = typeof relConfig === "object" && relConfig !== null && "where" in (relConfig as object)
            ? ((relConfig as { where?: Record<string, unknown> }).where || {})
            : {};
          const orderBy = typeof relConfig === "object" && relConfig !== null && "orderBy" in (relConfig as object)
            ? (relConfig as { orderBy?: unknown }).orderBy
            : { metricDate: "asc" };
          result.contentMetrics = await db.contentMetric.findMany({
            where: { postId: doc.id as string, ...filter },
            orderBy,
          });
        } else if (relKey === "automationTargets" && "id" in doc) {
          result.automationTargets = await db.automationTargetPost.findMany({
            where: { postId: doc.id as string },
          });
        } else if (relKey === "targetPosts" && "id" in doc) {
          result.targetPosts = await db.automationTargetPost.findMany({
            where: { automationId: doc.id as string },
          });
        } else if (relKey === "comments" && "id" in doc) {
          result.comments = await db.comment.findMany({
            where: { postId: doc.id as string },
          });
        } else if (relKey === "post" && "postId" in doc && doc.postId) {
          result.post = await db.post.findUnique({
            where: { id: doc.postId as string },
          });
        } else if (relKey === "_count" && typeof relConfig === "object") {
          const selectObj = (relConfig as { select?: Record<string, unknown> }).select;
          result._count = {};
          if (selectObj?.orders && "id" in doc) {
            const ordersFilter = (selectObj.orders as { where?: Record<string, unknown> }).where || {};
            (result._count as Record<string, number>).orders = await db.order.count({
              where: { productId: doc.id as string, ...ordersFilter },
            });
          }
        }
      }
    }

    if (select) {
      const selected: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(select)) {
        if (v && k in result) {
          selected[k] = result[k];
        }
      }
      return selected as unknown as T;
    }

    return result as unknown as T;
  }
}

export class AutoDmDatabase {
  public readonly user: CollectionModel<User>;
  public readonly workspace: CollectionModel<Workspace>;
  public readonly workspaceMember: CollectionModel<WorkspaceMember>;
  public readonly socialAccount: CollectionModel<SocialAccount>;
  public readonly platformConnection: CollectionModel<PlatformConnection>;
  public readonly profile: CollectionModel<Profile>;
  public readonly followerSnapshot: CollectionModel<FollowerSnapshot>;
  public readonly post: CollectionModel<Post>;
  public readonly contentMetric: CollectionModel<ContentMetric>;
  public readonly comment: CollectionModel<Comment>;
  public readonly automation: CollectionModel<Automation>;
  public readonly automationTargetPost: CollectionModel<AutomationTargetPost>;
  public readonly automationTrigger: CollectionModel<AutomationTrigger>;
  public readonly automationAction: CollectionModel<AutomationAction>;
  public readonly automationRun: CollectionModel<AutomationRun>;
  public readonly contact: CollectionModel<Contact>;
  public readonly contactTag: CollectionModel<ContactTag>;
  public readonly tag: CollectionModel<Tag>;
  public readonly lead: CollectionModel<Lead>;
  public readonly link: CollectionModel<Link>;
  public readonly linkClick: CollectionModel<LinkClick>;
  public readonly campaign: CollectionModel<Campaign>;
  public readonly conversion: CollectionModel<Conversion>;
  public readonly metricSnapshot: CollectionModel<MetricSnapshot>;
  public readonly webhook: CollectionModel<Webhook>;
  public readonly apiKey: CollectionModel<ApiKey>;
  public readonly auditLog: CollectionModel<AuditLog>;
  public readonly conversation: CollectionModel<Conversation>;
  public readonly message: CollectionModel<Message>;
  public readonly flow: CollectionModel<Flow>;
  public readonly flowNode: CollectionModel<FlowNode>;
  public readonly flowEdge: CollectionModel<FlowEdge>;
  public readonly product: CollectionModel<Product>;
  public readonly order: CollectionModel<Order>;
  public readonly bioPage: CollectionModel<BioPage>;
  public readonly bioLink: CollectionModel<BioLink>;
  public readonly subscription: CollectionModel<Subscription>;

  constructor() {
    const getDbFn = () => getDb();
    const self = () => this;

    this.user = new CollectionModel<User>("users", getDbFn, self);
    this.workspace = new CollectionModel<Workspace>("workspaces", getDbFn, self);
    this.workspaceMember = new CollectionModel<WorkspaceMember>("workspace_members", getDbFn, self);
    this.socialAccount = new CollectionModel<SocialAccount>("social_accounts", getDbFn, self);
    this.platformConnection = new CollectionModel<PlatformConnection>("platform_connections", getDbFn, self);
    this.profile = new CollectionModel<Profile>("profiles", getDbFn, self);
    this.followerSnapshot = new CollectionModel<FollowerSnapshot>("follower_snapshots", getDbFn, self);
    this.post = new CollectionModel<Post>("posts", getDbFn, self);
    this.contentMetric = new CollectionModel<ContentMetric>("content_metrics", getDbFn, self);
    this.comment = new CollectionModel<Comment>("comments", getDbFn, self);
    this.automation = new CollectionModel<Automation>("automations", getDbFn, self);
    this.automationTargetPost = new CollectionModel<AutomationTargetPost>("automation_target_posts", getDbFn, self);
    this.automationTrigger = new CollectionModel<AutomationTrigger>("automation_triggers", getDbFn, self);
    this.automationAction = new CollectionModel<AutomationAction>("automation_actions", getDbFn, self);
    this.automationRun = new CollectionModel<AutomationRun>("automation_runs", getDbFn, self);
    this.contact = new CollectionModel<Contact>("contacts", getDbFn, self);
    this.contactTag = new CollectionModel<ContactTag>("contact_tags", getDbFn, self);
    this.tag = new CollectionModel<Tag>("tags", getDbFn, self);
    this.lead = new CollectionModel<Lead>("leads", getDbFn, self);
    this.link = new CollectionModel<Link>("links", getDbFn, self);
    this.linkClick = new CollectionModel<LinkClick>("link_clicks", getDbFn, self);
    this.campaign = new CollectionModel<Campaign>("campaigns", getDbFn, self);
    this.conversion = new CollectionModel<Conversion>("conversions", getDbFn, self);
    this.metricSnapshot = new CollectionModel<MetricSnapshot>("metric_snapshots", getDbFn, self);
    this.webhook = new CollectionModel<Webhook>("webhooks", getDbFn, self);
    this.apiKey = new CollectionModel<ApiKey>("api_keys", getDbFn, self);
    this.auditLog = new CollectionModel<AuditLog>("audit_logs", getDbFn, self);
    this.conversation = new CollectionModel<Conversation>("conversations", getDbFn, self);
    this.message = new CollectionModel<Message>("messages", getDbFn, self);
    this.flow = new CollectionModel<Flow>("flows", getDbFn, self);
    this.flowNode = new CollectionModel<FlowNode>("flow_nodes", getDbFn, self);
    this.flowEdge = new CollectionModel<FlowEdge>("flow_edges", getDbFn, self);
    this.product = new CollectionModel<Product>("products", getDbFn, self);
    this.order = new CollectionModel<Order>("orders", getDbFn, self);
    this.bioPage = new CollectionModel<BioPage>("bio_pages", getDbFn, self);
    this.bioLink = new CollectionModel<BioLink>("bio_links", getDbFn, self);
    this.subscription = new CollectionModel<Subscription>("subscriptions", getDbFn, self);
  }

  async $transaction<T = any>(operations: any): Promise<T> {
    if (typeof operations === "function") {
      return operations(this);
    }
    return Promise.all(operations) as Promise<T>;
  }

  async $disconnect(): Promise<void> {
    if (client) {
      await client.close();
      connectedDb = null;
    }
  }
}

export const db = new AutoDmDatabase();
