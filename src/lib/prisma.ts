import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/client-gen/client";

export * from "../../prisma/client-gen/client";
export * from "../../prisma/client-gen/enums";
export { Prisma, PrismaClient } from "../../prisma/client-gen/client";
export type { ProductType, Platform } from "../../prisma/client-gen/enums";
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
  pool: Pool | undefined;
};

function getCleanConnectionString(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;
  // Strip ?sslmode=... from URL so Node pg doesn't trigger strict CA verification
  if (url.includes("sslmode=")) {
    url = url.replace(/([?&])sslmode=[^&]*(&|$)/, (m, p1, p2) => (p1 === "?" && p2 ? "?" : ""));
    url = url.replace(/[?&]$/, "");
  }
  return url;
}

const connectionString = getCleanConnectionString();
const databaseUrl = process.env.DATABASE_URL;
const isSslRequired =
  databaseUrl != null &&
  (databaseUrl.includes("supabase") ||
   databaseUrl.includes("sslmode=") ||
   process.env.NODE_ENV === "production");

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    ssl: isSslRequired ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
}

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
