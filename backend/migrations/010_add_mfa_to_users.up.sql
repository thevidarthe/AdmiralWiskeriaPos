-- ════════════════════════════════════════════════════════════
-- Migración 010: Agregar Soporte de Autenticación Multifactor (MFA TOTP)
-- ════════════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(128);
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT false;
