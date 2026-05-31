-- ════════════════════════════════════════════════════════════
-- Migración 009: Ajustar Catálogo de Sandoná con Licores Reales y Ortografía Correcta
-- ════════════════════════════════════════════════════════════

-- 1. Eliminar licores obsoletos (Aguardiente Galeras y stock/productos de Hervidos del inventario)
DELETE FROM stock_items WHERE product_id IN (
  SELECT id FROM products WHERE sku IN ('SHO-GAL-S', 'SHO-GAL-B', 'COC-HER-LUL', 'COC-HER-MOR')
);
DELETE FROM products WHERE sku IN ('SHO-GAL-S', 'SHO-GAL-B', 'COC-HER-LUL', 'COC-HER-MOR');

-- 2. Insertar Media de Aguardiente Nariño Azul (375ml) con ortografía correcta 'ñ'
INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at, image_url)
VALUES (
  'c1111111-1111-1111-1111-111111111111',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a',
  '0d3f9a36-8bb1-4515-9131-206942e07745', -- Shots/Botellas
  'Media de Aguardiente Nariño Azul (375ml)',
  'Aguardiente tradicional de Nariño en presentación de media botella (375ml). Suave y refinado.',
  'SHO-NAR-AZU-M',
  40000.00,
  0.19,
  'BOTTLE',
  true,
  true,
  now(),
  now(),
  '/images/aguardiente_narino.png'
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, base_price = EXCLUDED.base_price, image_url = EXCLUDED.image_url;

-- 3. Insertar Media de Aguardiente Amarillo de Manzanares (375ml)
INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at, image_url)
VALUES (
  'c2222222-2222-2222-2222-222222222222',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a',
  '0d3f9a36-8bb1-4515-9131-206942e07745',
  'Media de Aguardiente Amarillo de Manzanares (375ml)',
  'El pionero de los aguardientes amarillos, directo de Caldas. Notas aromáticas y anisadas en presentación media.',
  'SHO-AMA-MAN-M',
  45000.00,
  0.19,
  'BOTTLE',
  true,
  true,
  now(),
  now(),
  '/images/aguardiente_amarillo.png'
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, base_price = EXCLUDED.base_price, image_url = EXCLUDED.image_url;

-- 4. Insertar Botella de Aguardiente Amarillo de Manzanares (750ml)
INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at, image_url)
VALUES (
  'c3333333-3333-3333-3333-333333333333',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a',
  '0d3f9a36-8bb1-4515-9131-206942e07745',
  'Botella de Aguardiente Amarillo de Manzanares (750ml)',
  'Botella completa (750ml) del delicioso Aguardiente Amarillo de Manzanares. Ideal para compartir con amigos.',
  'SHO-AMA-MAN-B',
  80000.00,
  0.19,
  'BOTTLE',
  true,
  true,
  now(),
  now(),
  '/images/aguardiente_amarillo.png'
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, base_price = EXCLUDED.base_price, image_url = EXCLUDED.image_url;

-- 5. Insertar Chapil Artesanal Tradicional de Nariño
INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at, image_url)
VALUES (
  'c4444444-4444-4444-4444-444444444444',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a',
  '9436af2c-8921-429f-bca3-f04acc4ed17e', -- Cocteles/Tradicionales
  'Chapil Artesanal Tradicional (Vaso)',
  'Bebida emblemática y ancestral de Nariño destilada de jugo de caña de azúcar con hierbas aromáticas.',
  'SHO-CHA-ART',
  6000.00,
  0.19,
  'UNIT',
  true,
  true,
  now(),
  now(),
  '/images/chapil_artesanal.png'
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, base_price = EXCLUDED.base_price, image_url = EXCLUDED.image_url;

-- 6. Insertar Media de Ron Viejo de Caldas (375ml)
INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at, image_url)
VALUES (
  'c5555555-5555-5555-5555-555555555555',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a',
  'ec786275-c107-4b5b-88b8-0d2aa389004f', -- Ron
  'Media de Ron Viejo de Caldas 3 Años (375ml)',
  'Ron añejado en barricas de roble blanco. Presentación en media botella de 375ml.',
  'RON-CAL-3-M',
  45000.00,
  0.19,
  'BOTTLE',
  true,
  true,
  now(),
  now(),
  '/images/ron_caldas.png'
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, base_price = EXCLUDED.base_price, image_url = EXCLUDED.image_url;

-- 7. Actualizar la URL de imagen de los productos existentes para consistencia
UPDATE products SET image_url = '/images/aguardiente_narino.png' WHERE sku IN ('SHO-NAR-AZU-S', 'SHO-NAR-AZU-B') AND tenant_id = '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a';
UPDATE products SET image_url = '/images/ron_caldas.png' WHERE sku IN ('RON-CAL-3-S', 'RON-CAL-3-B') AND tenant_id = '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a';

-- 8. Asignar Stock Inicial (50 unidades) para la Sucursal de Sandoná
INSERT INTO stock_items (id, tenant_id, branch_id, product_id, quantity, updated_at)
VALUES
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'c1111111-1111-1111-1111-111111111111', 50.00, now()),
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'c2222222-2222-2222-2222-222222222222', 50.00, now()),
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'c3333333-3333-3333-3333-333333333333', 50.00, now()),
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'c4444444-4444-4444-4444-444444444444', 50.00, now()),
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'c5555555-5555-5555-5555-555555555555', 50.00, now())
ON CONFLICT DO NOTHING;

-- 9. Redirigir la acción de la regla del clima IFTTT 'Lluvia Sandoná' hacia la Media de Aguardiente Nariño Azul
UPDATE rule_actions
SET payload = '{"skus": ["SHO-NAR-AZU-M"], "promoPrice": 30000, "originalPrice": 40000, "active": true}'::jsonb
WHERE id = 'b2222222-2222-2222-2222-222222222222';

UPDATE rule_actions
SET payload = '{"webhookUrl": "http://n8n:5678/webhook/weather-promo", "message": "☔ ¡Lluvia en Sandoná! Media de Aguardiente Nariño Azul en descuento hoy en Admiral: de $40,000 COP a solo $30,000 COP. ¡Ven a calentarte con nosotros!"}'::jsonb
WHERE id = 'b3333333-3333-3333-3333-333333333333';
