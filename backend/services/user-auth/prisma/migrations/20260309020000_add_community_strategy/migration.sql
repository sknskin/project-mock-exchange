-- 커뮤니티 전략 공유 테이블 생성
-- Create community strategy sharing tables

-- 전략 메인 테이블
-- Strategy main table
CREATE TABLE "community_strategies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL,
    "author_name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "performance" DECIMAL(10, 2),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "community_strategies_pkey" PRIMARY KEY ("id")
);

-- 전략 좋아요 테이블
-- Strategy like table
CREATE TABLE "community_strategy_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "strategy_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_strategy_likes_pkey" PRIMARY KEY ("id")
);

-- 전략 댓글 테이블
-- Strategy comment table
CREATE TABLE "community_strategy_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "content" TEXT NOT NULL,
    "author_id" UUID NOT NULL,
    "author_name" VARCHAR(100) NOT NULL,
    "strategy_id" UUID NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_strategy_comments_pkey" PRIMARY KEY ("id")
);

-- 인덱스 생성
-- Create indexes
CREATE INDEX "community_strategies_author_id_idx" ON "community_strategies"("author_id");
CREATE INDEX "community_strategies_symbol_idx" ON "community_strategies"("symbol");
CREATE INDEX "community_strategies_created_at_idx" ON "community_strategies"("created_at" DESC);

CREATE UNIQUE INDEX "community_strategy_likes_user_id_strategy_id_key" ON "community_strategy_likes"("user_id", "strategy_id");

CREATE INDEX "community_strategy_comments_strategy_id_created_at_idx" ON "community_strategy_comments"("strategy_id", "created_at");

-- 외래 키 제약 조건
-- Foreign key constraints
ALTER TABLE "community_strategies" ADD CONSTRAINT "community_strategies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_strategy_likes" ADD CONSTRAINT "community_strategy_likes_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "community_strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_strategy_comments" ADD CONSTRAINT "community_strategy_comments_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "community_strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
