ALTER TABLE "chats" ADD COLUMN "last_message_at" TIMESTAMP(3);

UPDATE "chats" AS c
SET "last_message_at" = COALESCE(
  (
    SELECT MAX(m."created_at")
    FROM "messages" AS m
    WHERE m."chat_id" = c."id"
  ),
  c."updated_at",
  CURRENT_TIMESTAMP
);

ALTER TABLE "chats" ALTER COLUMN "last_message_at" SET NOT NULL;
ALTER TABLE "chats" ALTER COLUMN "last_message_at" SET DEFAULT CURRENT_TIMESTAMP;
