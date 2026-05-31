-- ════════════════════════════════════════════════════════════
-- Migración 002: Configuración de Marca y Plantillas WhatsApp
-- ════════════════════════════════════════════════════════════

-- ─── Brand Config ────────────────────────────────────────────
CREATE TABLE brand_configs (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID         NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id         UUID         REFERENCES branches(id) ON DELETE SET NULL,
  name              TEXT         NOT NULL,
  description       TEXT,
  logo_url          TEXT,
  primary_color     VARCHAR(7),
  secondary_color   VARCHAR(7),
  whatsapp_phone    VARCHAR(20),
  email             VARCHAR(180),
  website           TEXT,
  address           TEXT,
  metadata          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  active            BOOLEAN      NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_brand_tenant ON brand_configs(tenant_id);
CREATE INDEX idx_brand_branch ON brand_configs(branch_id);

-- ─── WhatsApp Message Templates ──────────────────────────────
CREATE TABLE whatsapp_message_templates (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id         UUID         REFERENCES branches(id) ON DELETE SET NULL,
  name              TEXT         NOT NULL,
  slug              VARCHAR(80)  NOT NULL,
  category          VARCHAR(20)  NOT NULL DEFAULT 'MARKETING',
  language          VARCHAR(5)   NOT NULL DEFAULT 'es',
  content           TEXT         NOT NULL,
  variables         JSONB        NOT NULL DEFAULT '[]'::jsonb,
  meta_id           VARCHAR(180),
  status            VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
  active            BOOLEAN      NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_wa_template_tenant_slug ON whatsapp_message_templates(tenant_id, slug);
CREATE INDEX idx_wa_template_active ON whatsapp_message_templates(tenant_id, active);

-- ─── WhatsApp Promotion Campaigns ────────────────────────────
CREATE TABLE whatsapp_promotion_campaigns (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id         UUID         REFERENCES branches(id) ON DELETE SET NULL,
  promotion_id      UUID         NOT NULL REFERENCES promotion_rules(id) ON DELETE CASCADE,
  name              TEXT         NOT NULL,
  template_id       UUID         NOT NULL REFERENCES whatsapp_message_templates(id) ON DELETE RESTRICT,
  segment_query     JSONB,
  status            VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
  scheduled_at      TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  total_recipients  INT          NOT NULL DEFAULT 0,
  total_sent        INT          NOT NULL DEFAULT 0,
  total_delivered   INT          NOT NULL DEFAULT 0,
  total_read        INT          NOT NULL DEFAULT 0,
  total_failed      INT          NOT NULL DEFAULT 0,
  total_clicks      INT          NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_promo_tenant ON whatsapp_promotion_campaigns(tenant_id);
CREATE INDEX idx_wa_promo_promotion ON whatsapp_promotion_campaigns(promotion_id);
CREATE INDEX idx_wa_promo_status ON whatsapp_promotion_campaigns(status);

-- ─── Enhanced QR Codes (tipos diferentes) ────────────────────
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'TABLE';
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
CREATE INDEX idx_qr_type ON qr_codes(type);
CREATE INDEX idx_qr_reference ON qr_codes(reference_type, reference_id);

-- ─── Triggers para updated_at ────────────────────────────────
CREATE TRIGGER brand_configs_updated_at BEFORE UPDATE ON brand_configs
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER whatsapp_message_templates_updated_at BEFORE UPDATE ON whatsapp_message_templates
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER whatsapp_promotion_campaigns_updated_at BEFORE UPDATE ON whatsapp_promotion_campaigns
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
