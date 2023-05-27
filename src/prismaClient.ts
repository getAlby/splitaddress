import { PrismaClient } from "@prisma/client";

export const prismaClient = createPrismaClient();

function createPrismaClient() {
  const client = new PrismaClient();
  return client;
}
