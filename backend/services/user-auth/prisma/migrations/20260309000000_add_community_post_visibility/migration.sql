-- AlterTable: Add visibility column to community_posts with default 'PUBLIC'
ALTER TABLE "community_posts" ADD COLUMN "visibility" VARCHAR(20) NOT NULL DEFAULT 'PUBLIC';
