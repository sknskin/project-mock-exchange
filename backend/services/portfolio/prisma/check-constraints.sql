-- Account 잔고 음수 방지 CHECK 제약
-- Prevent negative balances at the database level
ALTER TABLE accounts ADD CONSTRAINT chk_available_cash_non_negative CHECK (available_cash >= 0);
ALTER TABLE accounts ADD CONSTRAINT chk_reserved_cash_non_negative CHECK (reserved_cash >= 0);

-- Holding 수량 음수 방지
ALTER TABLE holdings ADD CONSTRAINT chk_quantity_non_negative CHECK (quantity >= 0);
