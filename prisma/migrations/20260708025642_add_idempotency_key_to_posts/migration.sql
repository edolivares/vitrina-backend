/*
  Warnings:

  - A unique constraint covering the columns `[idempotency_key]` on the table `posts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "posts_idempotency_key_key" ON "posts"("idempotency_key");
