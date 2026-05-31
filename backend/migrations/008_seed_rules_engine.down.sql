-- ════════════════════════════════════════════════════════════
-- Migración 008: Revertir Semilla de Reglas IFTTT
-- ════════════════════════════════════════════════════════════

DELETE FROM rule_actions WHERE rule_id = 'b1111111-1111-1111-1111-111111111111';
DELETE FROM rules WHERE id = 'b1111111-1111-1111-1111-111111111111';
