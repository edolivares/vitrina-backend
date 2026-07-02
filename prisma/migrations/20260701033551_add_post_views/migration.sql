-- CreateTable
CREATE TABLE "post_views" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "viewer_id" UUID,
    "ip_hash" TEXT,
    "user_agent_hash" TEXT,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_views_post_id_viewed_at_idx" ON "post_views"("post_id", "viewed_at");

-- CreateIndex
CREATE INDEX "post_views_post_id_viewer_id_viewed_at_idx" ON "post_views"("post_id", "viewer_id", "viewed_at");

-- CreateIndex
CREATE INDEX "post_views_post_id_ip_hash_user_agent_hash_viewed_at_idx" ON "post_views"("post_id", "ip_hash", "user_agent_hash", "viewed_at");

-- AddForeignKey
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
