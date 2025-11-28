import { PrismaClient } from "@prisma/client";
import { config } from "../../prisma/config";

declare global {
  var prisma: PrismaClient | undefined;
}

export const client = globalThis.prisma || new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl || process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = client;
}
