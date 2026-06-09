-- WhatsApp Bot: conversations, messages, outbox, bot sessions
-- Requires: 001_init.up.sql

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    customer_id     UUID REFERENCES customers(id),
    phone           VARCHAR(20) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    assigned_user_id UUID REFERENCES users(id),
    bot_enabled     BOOLEAN NOT NULL DEFAULT true,
    last_message_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_tenant ON whatsapp_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_phone ON whatsapp_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_wa_conv_status ON whatsapp_conversations(status);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id),
    direction       VARCHAR(10) NOT NULL,
    wa_message_id   VARCHAR(64),
    message_type    VARCHAR(20) NOT NULL DEFAULT 'text',
    body            TEXT,
    payload         JSONB DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_msg_wa_id ON whatsapp_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wa_msg_conv ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_tenant ON whatsapp_messages(tenant_id);

CREATE TABLE IF NOT EXISTS whatsapp_outbox (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    conversation_id UUID REFERENCES whatsapp_conversations(id),
    phone           VARCHAR(20) NOT NULL,
    message_type    VARCHAR(20) NOT NULL DEFAULT 'template',
    template_name   VARCHAR(100),
    body            TEXT,
    payload         JSONB DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    attempts        INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_error      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wa_outbox_status ON whatsapp_outbox(status, next_attempt_at)
    WHERE status IN ('QUEUED', 'RETRYING');
CREATE INDEX IF NOT EXISTS idx_wa_outbox_tenant ON whatsapp_outbox(tenant_id);

CREATE TABLE IF NOT EXISTS whatsapp_bot_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id),
    current_state   VARCHAR(50) NOT NULL DEFAULT 'WELCOME',
    context         JSONB DEFAULT '{}',
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_bot_conv ON whatsapp_bot_sessions(conversation_id);

CREATE TRIGGER trg_wa_conv_updated_at BEFORE UPDATE ON whatsapp_conversations
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
CREATE TRIGGER trg_wa_bot_updated_at BEFORE UPDATE ON whatsapp_bot_sessions
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
