-- 트레이더 팔로우 테이블 생성
-- Create trader follows table
CREATE TABLE "trader_follows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "follower_id" UUID NOT NULL,
    "followee_id" UUID NOT NULL,
    "notify_mode" VARCHAR(20) NOT NULL DEFAULT 'ALL',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "trader_follows_pkey" PRIMARY KEY ("id")
);

-- 동일 사용자 중복 팔로우 방지 유니크 제약
-- Unique constraint to prevent duplicate follows
CREATE UNIQUE INDEX "trader_follows_follower_id_followee_id_key" ON "trader_follows"("follower_id", "followee_id");

-- 팔로워 기준 인덱스 (내가 팔로우하는 목록 조회용)
-- Index on follower_id (for listing who I follow)
CREATE INDEX "trader_follows_follower_id_idx" ON "trader_follows"("follower_id");

-- 팔로우 대상 기준 인덱스 (나를 팔로우하는 목록 조회용)
-- Index on followee_id (for listing my followers)
CREATE INDEX "trader_follows_followee_id_idx" ON "trader_follows"("followee_id");

-- 팔로워 → 사용자 외래키 (CASCADE 삭제)
-- Foreign key from follower to users (CASCADE delete)
ALTER TABLE "trader_follows" ADD CONSTRAINT "trader_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 팔로우 대상 → 사용자 외래키 (CASCADE 삭제)
-- Foreign key from followee to users (CASCADE delete)
ALTER TABLE "trader_follows" ADD CONSTRAINT "trader_follows_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
