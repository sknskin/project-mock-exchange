-- CreateTable
CREATE TABLE "trader_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "side" VARCHAR(4) NOT NULL,
    "quantity" DECIMAL(20,8) NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "trade_id" VARCHAR(50) NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trader_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copy_trade_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "follower_id" UUID NOT NULL,
    "trader_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "scale_ratio" DECIMAL(10,4) NOT NULL DEFAULT 1.0,
    "max_investment" DECIMAL(20,8) NOT NULL,
    "stop_loss_percent" DECIMAL(5,2),
    "total_invested" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "copy_trade_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copy_trade_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "config_id" UUID NOT NULL,
    "follower_id" UUID NOT NULL,
    "trader_id" UUID NOT NULL,
    "original_trade_id" VARCHAR(50) NOT NULL,
    "copied_order_id" VARCHAR(50),
    "symbol" VARCHAR(20) NOT NULL,
    "side" VARCHAR(4) NOT NULL,
    "original_qty" DECIMAL(20,8) NOT NULL,
    "copied_qty" DECIMAL(20,8) NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "fail_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "copy_trade_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trader_activities_user_id_created_at_idx" ON "trader_activities"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "trader_activities_created_at_idx" ON "trader_activities"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "copy_trade_configs_follower_id_trader_id_key" ON "copy_trade_configs"("follower_id", "trader_id");

-- CreateIndex
CREATE INDEX "copy_trade_configs_trader_id_is_active_idx" ON "copy_trade_configs"("trader_id", "is_active");

-- CreateIndex
CREATE INDEX "copy_trade_executions_follower_id_created_at_idx" ON "copy_trade_executions"("follower_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "copy_trade_executions_config_id_idx" ON "copy_trade_executions"("config_id");

-- AddForeignKey
ALTER TABLE "copy_trade_executions" ADD CONSTRAINT "copy_trade_executions_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "copy_trade_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
