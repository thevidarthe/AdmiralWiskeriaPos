-- ════════════════════════════════════════════════════════════
-- Migración 008: Sembrar Reglas del Motor IFTTT (Sandoná Nariño Clima)
-- ════════════════════════════════════════════════════════════

-- Regla: Lluvia en Sandoná -> Descuento en Hervidos Nariñenses + Notificación WhatsApp
INSERT INTO rules (id, tenant_id, name, trigger_type, condition_js, active, created_at, updated_at)
VALUES (
  'b1111111-1111-1111-1111-111111111111',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', -- Tenant ID
  'Lluvia Sandoná (Hervidos Promo)',
  'weather.changed',
  'event.weather === ''rainy'' && event.temperature < 20',
  true,
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Acción 1: pos.apply_promo (Aplica precio promo a Hervido de Lulo y Mora)
INSERT INTO rule_actions (id, rule_id, type, payload, sort_order, created_at)
VALUES (
  'b2222222-2222-2222-2222-222222222222',
  'b1111111-1111-1111-1111-111111111111',
  'pos.apply_promo',
  '{"skus": ["COC-HER-LUL", "COC-HER-MOR"], "promoPrice": 12500, "originalPrice": 25000, "active": true}'::jsonb,
  1,
  now()
) ON CONFLICT DO NOTHING;

-- Acción 2: whatsapp.webhook (Notificación a n8n)
INSERT INTO rule_actions (id, rule_id, type, payload, sort_order, created_at)
VALUES (
  'b3333333-3333-3333-3333-333333333333',
  'b1111111-1111-1111-1111-111111111111',
  'whatsapp.webhook',
  '{"webhookUrl": "http://n8n:5678/webhook/weather-promo", "message": "☔ ¡Lluvia en Sandoná! Hervidos Nariñenses a mitad de precio en Admiral: $12,500 COP la jarra. ¡Ven a calentarte con nosotros!"}'::jsonb,
  2,
  now()
) ON CONFLICT DO NOTHING;
