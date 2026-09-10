import "dotenv/config";
import { PrismaClient } from "../../prisma/generated-client/client";
import { PrismaPg } from "@prisma/adapter-pg";

export * from "../../prisma/generated-client/client";
export * from "../../prisma/generated-client/enums";
export { Prisma, PrismaClient } from "../../prisma/generated-client/client";
export type { ProductType, Platform } from "../../prisma/generated-client/enums";
export type {
  Comment,
  Post,
  FollowerSnapshot,
  User,
  Workspace,
  SocialAccount,
  Automation,
  Contact,
  Lead,
  Conversation,
  Message,
  Flow,
  Product,
  Order,
} from "../../prisma/generated-client/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
