-- ════════════════════════════════════════════════════════════
-- Migración 006 (Rollback): Eliminar Tablas del Motor de Reglas
-- ════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS rule_actions;
DROP TABLE IF EXISTS rules;
