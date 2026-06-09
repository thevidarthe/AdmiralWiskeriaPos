DROP TRIGGER IF EXISTS trg_wa_bot_updated_at ON whatsapp_bot_sessions;
DROP TRIGGER IF EXISTS trg_wa_conv_updated_at ON whatsapp_conversations;
DROP TABLE IF EXISTS whatsapp_bot_sessions;
DROP TABLE IF EXISTS whatsapp_outbox;
DROP TABLE IF EXISTS whatsapp_messages;
DROP TABLE IF EXISTS whatsapp_conversations;
