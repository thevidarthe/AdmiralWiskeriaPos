-- ════════════════════════════════════════════════════════════
-- Rollback Migración 002
-- ════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS whatsapp_promotion_campaigns_updated_at ON whatsapp_promotion_campaigns;
DROP TRIGGER IF EXISTS whatsapp_message_templates_updated_at ON whatsapp_message_templates;
DROP TRIGGER IF EXISTS brand_configs_updated_at ON brand_configs;

DROP TABLE IF EXISTS whatsapp_promotion_campaigns;
DROP TABLE IF EXISTS whatsapp_message_templates;
DROP TABLE IF EXISTS brand_configs;

ALTER TABLE qr_codes DROP COLUMN IF EXISTS type;
ALTER TABLE qr_codes DROP COLUMN IF EXISTS reference_id;
ALTER TABLE qr_codes DROP COLUMN IF EXISTS reference_type;
