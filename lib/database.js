import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

if (process.env.NODE_ENV !== "test") {
  try {
    await prisma.$connect();
    console.log("Database connected successfully via Prisma");
  } catch (error) {
    console.log("Error connecting to database:", error.message);
  }
}
