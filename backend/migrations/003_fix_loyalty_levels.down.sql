-- ════════════════════════════════════════════════════════════
-- Rollback Migración 003
-- ════════════════════════════════════════════════════════════

ALTER TABLE promotion_rules ALTER COLUMN loyalty_levels SET NOT NULL;
ALTER TABLE promotion_rules ALTER COLUMN loyalty_levels SET DEFAULT '{}'::text[];
