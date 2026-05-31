-- ════════════════════════════════════════════════════════════
-- Migración 006: Crear Tablas del Motor de Reglas IFTTT
-- ════════════════════════════════════════════════════════════

CREATE TABLE rules (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  trigger_type    VARCHAR(50)  NOT NULL,
  condition_js    TEXT         NOT NULL,
  active          BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_rules_trigger ON rules(trigger_type, active);

CREATE TABLE rule_actions (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id         UUID         NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  type            VARCHAR(50)  NOT NULL,
  payload         JSONB        NOT NULL DEFAULT '{}'::jsonb,
  sort_order      INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_rule_action_rule ON rule_actions(rule_id);

-- Triggers para set_updated_at
CREATE TRIGGER rules_updated_at BEFORE UPDATE ON rules
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
