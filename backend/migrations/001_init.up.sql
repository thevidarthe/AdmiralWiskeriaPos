-- ════════════════════════════════════════════════════════════
-- Admiral Pro — Migración 001: schema inicial
-- ════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tenancy ────────────────────────────────────────────────
CREATE TABLE tenants (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(60)  UNIQUE NOT NULL,
  name        TEXT         NOT NULL,
  config      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  active      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE branches (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT         NOT NULL,
  address     TEXT,
  timezone    VARCHAR(60)  NOT NULL DEFAULT 'America/Bogota',
  settings    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  active      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_branches_tenant ON branches(tenant_id);

-- ─── Usuarios ───────────────────────────────────────────────
CREATE TABLE users (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           VARCHAR(180) NOT NULL,
  name            TEXT         NOT NULL,
  phone           VARCHAR(30),
  avatar_url      TEXT,
  password_hash   TEXT         NOT NULL,
  pin_hash        TEXT         NOT NULL,
  role            VARCHAR(20)  NOT NULL DEFAULT 'WAITER',
  active          BOOLEAN      NOT NULL DEFAULT true,
  failed_attempts INT          NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_users_tenant_email ON users(tenant_id, lower(email));
CREATE INDEX idx_users_tenant_active ON users(tenant_id, active);

-- ─── Zonas y mesas ──────────────────────────────────────────
CREATE TABLE zones (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL,
  branch_id   UUID         NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name        TEXT         NOT NULL,
  type        VARCHAR(20)  NOT NULL DEFAULT 'FLOOR',
  active      BOOLEAN      NOT NULL DEFAULT true
);
CREATE INDEX idx_zones_tenant_branch ON zones(tenant_id, branch_id);

CREATE TABLE tables (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL,
  branch_id   UUID         NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  zone_id     UUID         NOT NULL REFERENCES zones(id),
  number      VARCHAR(20)  NOT NULL,
  capacity    INT          NOT NULL DEFAULT 4,
  status      VARCHAR(20)  NOT NULL DEFAULT 'FREE'
);
CREATE UNIQUE INDEX idx_tables_branch_number ON tables(branch_id, number);
CREATE INDEX idx_tables_tenant_status ON tables(tenant_id, branch_id, status);

-- ─── QR ─────────────────────────────────────────────────────
CREATE TABLE qr_codes (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL,
  branch_id   UUID         NOT NULL,
  table_id    UUID         NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  token       UUID         NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  svg_data    TEXT,
  active      BOOLEAN      NOT NULL DEFAULT true,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_qr_tenant_active ON qr_codes(tenant_id, active);

-- ─── Catálogo ───────────────────────────────────────────────
CREATE TABLE categories (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_id   UUID,
  name        TEXT         NOT NULL,
  slug        VARCHAR(80)  NOT NULL,
  icon        VARCHAR(8),
  color       VARCHAR(20),
  sort_order  INT          NOT NULL DEFAULT 0,
  active      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_categories_tenant_slug ON categories(tenant_id, slug);
CREATE INDEX idx_categories_active ON categories(tenant_id, active, sort_order);

CREATE TABLE products (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id     UUID            NOT NULL REFERENCES categories(id),
  name            TEXT            NOT NULL,
  description     TEXT,
  sku             VARCHAR(50),
  barcode         VARCHAR(50),
  base_price      NUMERIC(12,2)   NOT NULL,
  cost_price      NUMERIC(12,2),
  tax_rate        NUMERIC(5,4)    NOT NULL DEFAULT 0.19,
  unit            VARCHAR(10)     NOT NULL DEFAULT 'UNIT',
  unit_size       NUMERIC(10,2),
  alcohol_volume  NUMERIC(5,2),
  image_url       TEXT,
  is_combo        BOOLEAN         NOT NULL DEFAULT false,
  combo_items     JSONB,
  track_inventory BOOLEAN         NOT NULL DEFAULT true,
  min_stock       NUMERIC(10,2),
  available       BOOLEAN         NOT NULL DEFAULT true,
  sort_order      INT             NOT NULL DEFAULT 0,
  metadata        JSONB           NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_products_tenant_sku ON products(tenant_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_products_tenant_category ON products(tenant_id, category_id);
CREATE INDEX idx_products_tenant_available ON products(tenant_id, available);

-- ─── Inventario ─────────────────────────────────────────────
CREATE TABLE stock_items (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL,
  branch_id   UUID         NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id  UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_stock_branch_product ON stock_items(branch_id, product_id);
CREATE INDEX idx_stock_tenant_branch ON stock_items(tenant_id, branch_id);

CREATE TABLE inventory_movements (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL,
  branch_id       UUID         NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id      UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type   VARCHAR(20)  NOT NULL,
  quantity        NUMERIC(12,2) NOT NULL,
  unit_cost       NUMERIC(12,2),
  reference_type  VARCHAR(30),
  reference_id    UUID,
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_movements_branch_created ON inventory_movements(tenant_id, branch_id, created_at DESC);
CREATE INDEX idx_movements_product_created ON inventory_movements(tenant_id, product_id, created_at DESC);

-- ─── Clientes y lealtad ─────────────────────────────────────
CREATE TABLE customers (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT         NOT NULL,
  phone           VARCHAR(20)  NOT NULL,
  email           VARCHAR(180),
  birthday        DATE,
  loyalty_level   VARCHAR(20)  NOT NULL DEFAULT 'CLASSIC',
  points_balance  INT          NOT NULL DEFAULT 0,
  total_spent     NUMERIC(14,2) NOT NULL DEFAULT 0,
  visit_count     INT          NOT NULL DEFAULT 0,
  last_visit_at   TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_customers_tenant_phone ON customers(tenant_id, phone);
CREATE INDEX idx_customers_loyalty ON customers(tenant_id, loyalty_level);

CREATE TABLE whatsapp_consents (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID         NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type          VARCHAR(30)  NOT NULL,
  channel       VARCHAR(30)  NOT NULL,
  active        BOOLEAN      NOT NULL DEFAULT true,
  terms_version VARCHAR(10)  NOT NULL DEFAULT 'v1',
  consented_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ
);
CREATE INDEX idx_consents_customer ON whatsapp_consents(customer_id, type, active);

CREATE TABLE loyalty_transactions (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID         NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id      UUID,
  points_delta INT          NOT NULL,
  reason       TEXT         NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_loyalty_customer_created ON loyalty_transactions(customer_id, created_at DESC);

-- ─── Turnos y ventas ────────────────────────────────────────
CREATE TABLE shifts (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID         NOT NULL,
  branch_id    UUID         NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id      UUID         NOT NULL REFERENCES users(id),
  opened_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  closed_at    TIMESTAMPTZ,
  open_float   NUMERIC(12,2) NOT NULL DEFAULT 0,
  close_float  NUMERIC(12,2),
  notes        TEXT
);
CREATE INDEX idx_shifts_branch_opened ON shifts(tenant_id, branch_id, opened_at DESC);

CREATE TABLE sales (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL,
  branch_id       UUID         NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  table_id        UUID         REFERENCES tables(id),
  shift_id        UUID         REFERENCES shifts(id),
  user_id         UUID         REFERENCES users(id),
  customer_id     UUID         REFERENCES customers(id),
  name            TEXT,
  status          VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
  source          VARCHAR(20)  NOT NULL DEFAULT 'POS',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  tip_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  opened_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ
);
CREATE INDEX idx_sales_branch_status ON sales(tenant_id, branch_id, status);
CREATE INDEX idx_sales_opened ON sales(tenant_id, opened_at DESC);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_table_open ON sales(table_id) WHERE status IN ('OPEN', 'PENDING_PAYMENT');

CREATE TABLE sale_items (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID         NOT NULL,
  sale_id       UUID         NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id    UUID         NOT NULL REFERENCES products(id),
  product_name  TEXT         NOT NULL,
  quantity      NUMERIC(10,2) NOT NULL,
  unit_price    NUMERIC(12,2) NOT NULL,
  discount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate      NUMERIC(5,4) NOT NULL DEFAULT 0.19,
  line_total    NUMERIC(12,2) NOT NULL,
  promo_applied TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(tenant_id, product_id);

CREATE TABLE payments (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL,
  sale_id     UUID         NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method      VARCHAR(20)  NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'COMPLETED',
  reference   TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_tenant_created ON payments(tenant_id, created_at DESC);

-- ─── Promociones ────────────────────────────────────────────
CREATE TABLE promotion_rules (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT         NOT NULL,
  description      TEXT,
  type             VARCHAR(30)  NOT NULL,
  discount_value   NUMERIC(8,2) NOT NULL,
  start_time       VARCHAR(5),
  end_time         VARCHAR(5),
  days_of_week     INT[]        NOT NULL DEFAULT '{}',
  min_order_amount NUMERIC(12,2),
  loyalty_levels   TEXT[]       NOT NULL DEFAULT '{}',
  stackable        BOOLEAN      NOT NULL DEFAULT false,
  active           BOOLEAN      NOT NULL DEFAULT true,
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_promo_tenant_active ON promotion_rules(tenant_id, active);

CREATE TABLE promotion_rule_products (
  rule_id    UUID NOT NULL REFERENCES promotion_rules(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (rule_id, product_id)
);

CREATE TABLE coupons (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code          VARCHAR(30)  NOT NULL,
  discount_type VARCHAR(20)  NOT NULL,
  value         NUMERIC(10,2) NOT NULL,
  max_uses      INT,
  used_count    INT          NOT NULL DEFAULT 0,
  starts_at     TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  active        BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_coupons_tenant_code ON coupons(tenant_id, code);

-- ─── WhatsApp ───────────────────────────────────────────────
CREATE TABLE message_templates (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT         NOT NULL,
  wa_id       TEXT         NOT NULL,
  category    VARCHAR(20)  NOT NULL,
  language    VARCHAR(8)   NOT NULL DEFAULT 'es',
  components  JSONB        NOT NULL,
  active      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_templates_tenant_active ON message_templates(tenant_id, active);

CREATE TABLE campaigns (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id       UUID,
  name            TEXT         NOT NULL,
  template_id     UUID         REFERENCES message_templates(id),
  segment_query   JSONB        NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  total_sent      INT          NOT NULL DEFAULT 0,
  total_delivered INT          NOT NULL DEFAULT 0,
  total_read      INT          NOT NULL DEFAULT 0,
  total_failed    INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaigns_tenant_status ON campaigns(tenant_id, status);

CREATE TABLE message_logs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID         REFERENCES campaigns(id) ON DELETE SET NULL,
  customer_id   UUID         NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  wa_message_id TEXT,
  phone         VARCHAR(20)  NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'QUEUED',
  sent_at       TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,
  fail_reason   TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_customer_sent ON message_logs(customer_id, sent_at DESC);
CREATE INDEX idx_messages_campaign_status ON message_logs(campaign_id, status);

-- ─── Auditoría ──────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL,
  user_id     UUID,
  action      VARCHAR(60)  NOT NULL,
  entity_type VARCHAR(60)  NOT NULL,
  entity_id   UUID,
  changes     JSONB,
  ip_address  VARCHAR(60),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_tenant_user ON audit_logs(tenant_id, user_id);

-- ─── Trigger updated_at automático ──────────────────────────
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER users_updated_at    BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER stock_items_updated_at BEFORE UPDATE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
