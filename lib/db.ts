import { PrismaClient } from "@/src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}

// Driver adapter (no Rust query engine at runtime): PrismaNeon manages its
// own Neon pool internally from the pooled connection string. Requires a
// runtime with global WebSocket (Node 22+ — see package.json engines;
// Bun provides it natively).
const adapter = new PrismaNeon({ connectionString });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
