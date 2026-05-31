-- ════════════════════════════════════════════════════════════
-- Migración 005: Crear Tablas de División de Cuentas (Split Bill)
-- ════════════════════════════════════════════════════════════

CREATE TABLE sale_splits (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id         UUID         NOT NULL UNIQUE REFERENCES sales(id) ON DELETE CASCADE,
  total_shares    INT          NOT NULL DEFAULT 1,
  status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE sale_shares (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_split_id   UUID         NOT NULL REFERENCES sale_splits(id) ON DELETE CASCADE,
  customer_id     UUID         REFERENCES customers(id) ON DELETE SET NULL,
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20)  NOT NULL,
  share_amount    NUMERIC(12,2) NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  payment_id      UUID         REFERENCES payments(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_share_split ON sale_shares(sale_split_id);
CREATE INDEX idx_sale_share_customer ON sale_shares(customer_id);
CREATE INDEX idx_sale_share_status ON sale_shares(status);

-- Triggers para set_updated_at
CREATE TRIGGER sale_splits_updated_at BEFORE UPDATE ON sale_splits
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER sale_shares_updated_at BEFORE UPDATE ON sale_shares
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
