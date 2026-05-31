-- ════════════════════════════════════════════════════════════
-- Rollback Migración 010: Remover Soporte de MFA TOTP
-- ════════════════════════════════════════════════════════════

ALTER TABLE users DROP COLUMN IF EXISTS mfa_secret;
ALTER TABLE users DROP COLUMN IF EXISTS mfa_enabled;
