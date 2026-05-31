-- ════════════════════════════════════════════════════════════
-- Migración 004: Crear tabla de Consentimientos de WhatsApp
-- ════════════════════════════════════════════════════════════

CREATE TABLE whats_app_consents (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID         NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type           VARCHAR(50)  NOT NULL,
  channel        VARCHAR(50)  NOT NULL,
  active         BOOLEAN      NOT NULL DEFAULT true,
  terms_version  VARCHAR(10)  NOT NULL DEFAULT 'v1',
  consented_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  revoked_at     TIMESTAMPTZ
);

CREATE INDEX idx_wa_consent_customer ON whats_app_consents(customer_id);
CREATE INDEX idx_wa_consent_active ON whats_app_consents(active);
