-- ════════════════════════════════════════════════════════════
-- Migración 003: Fix loyalty_levels nullable
-- ════════════════════════════════════════════════════════════

ALTER TABLE promotion_rules ALTER COLUMN loyalty_levels DROP NOT NULL;
ALTER TABLE promotion_rules ALTER COLUMN loyalty_levels SET DEFAULT ARRAY[]::text[];
