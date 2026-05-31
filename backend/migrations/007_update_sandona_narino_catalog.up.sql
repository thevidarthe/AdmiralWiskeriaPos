-- ════════════════════════════════════════════════════════════
-- Migración 007: Ajustar Catálogo para Sandoná, Nariño (Licores Locales)
-- ════════════════════════════════════════════════════════════

-- 1. Eliminar licores importados costosos de nula rotación en la zona
DELETE FROM products WHERE sku IN ('WHI-GLE-12', 'WHI-MAC-12', 'WHI-JWB', 'WHI-CHI-12');

-- 2. Insertar licores regionales tradicionales con precios y SKUs localizados
-- Aguardiente Nariño Azul
INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', -- Tenant ID
  '0d3f9a36-8bb1-4515-9131-206942e07745', -- Shots Category ID
  'Aguardiente Nariño Azul (Trago)',
  'El rey de la casa. Aguardiente tradicional de Nariño, suave y refrescante.',
  'SHO-NAR-AZU-S',
  5000.00,
  0.19,
  'SHOT',
  true,
  true,
  now(),
  now()
) ON CONFLICT DO NOTHING;

INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at)
VALUES (
  'a2222222-2222-2222-2222-222222222222',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', -- Tenant ID
  '0d3f9a36-8bb1-4515-9131-206942e07745', -- Shots Category ID
  'Aguardiente Nariño Azul (Botella)',
  'Botella entera de Aguardiente Nariño Azul de 750ml.',
  'SHO-NAR-AZU-B',
  70000.00,
  0.19,
  'BOTTLE',
  true,
  true,
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Aguardiente Galeras
INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at)
VALUES (
  'a3333333-3333-3333-3333-333333333333',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a',
  '0d3f9a36-8bb1-4515-9131-206942e07745', -- Shots Category ID
  'Aguardiente Galeras (Trago)',
  'Aguardiente tradicional de la falda del volcán Galeras, fuerte y anisado.',
  'SHO-GAL-S',
  4500.00,
  0.19,
  'SHOT',
  true,
  true,
  now(),
  now()
) ON CONFLICT DO NOTHING;

INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at)
VALUES (
  'a4444444-4444-4444-4444-444444444444',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a',
  '0d3f9a36-8bb1-4515-9131-206942e07745', -- Shots Category ID
  'Aguardiente Galeras (Botella)',
  'Botella entera de Aguardiente Galeras de 750ml.',
  'SHO-GAL-B',
  60000.00,
  0.19,
  'BOTTLE',
  true,
  true,
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Hervido de Lulo
INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at)
VALUES (
  'a5555555-5555-5555-5555-555555555555',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a',
  '9436af2c-8921-429f-bca3-f04acc4ed17e', -- Cocteles Category ID
  'Hervido Caliente de Lulo (Jarra)',
  'Bebida caliente tradicional de Nariño. Jugo concentrado de lulo hervido con canela, especias y Aguardiente Nariño.',
  'COC-HER-LUL',
  25000.00,
  0.19,
  'UNIT',
  true,
  true,
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Hervido de Mora
INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at)
VALUES (
  'a6666666-6666-6666-6666-666666666666',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a',
  '9436af2c-8921-429f-bca3-f04acc4ed17e', -- Cocteles Category ID
  'Hervido Caliente de Mora (Jarra)',
  'Delicioso hervido tradicional de mora de Castilla caliente con especias y el toque del Aguardiente Nariño.',
  'COC-HER-MOR',
  25000.00,
  0.19,
  'UNIT',
  true,
  true,
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Chicha Artesanal de Sandoná
INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at)
VALUES (
  'a7777777-7777-7777-7777-777777777777',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a',
  '9436af2c-8921-429f-bca3-f04acc4ed17e', -- Cocteles Category ID
  'Chicha Artesanal de Sandoná (Vaso)',
  'Bebida ancestral fermentada artesanalmente en Sandoná, dulce y refrescante.',
  'COC-CHI-SAN',
  6000.00,
  0.19,
  'UNIT',
  true,
  true,
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Ron Viejo de Caldas 3 Años
INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at)
VALUES (
  'a8888888-8888-8888-8888-888888888888',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a',
  'ec786275-c107-4b5b-88b8-0d2aa389004f', -- Ron Category ID
  'Ron Viejo de Caldas 3 Años (Trago)',
  'Trago de Ron Viejo de Caldas añejado 3 años en barricas de roble blanco.',
  'RON-CAL-3-S',
  7000.00,
  0.19,
  'SHOT',
  true,
  true,
  now(),
  now()
) ON CONFLICT DO NOTHING;

INSERT INTO products (id, tenant_id, category_id, name, description, sku, base_price, tax_rate, unit, available, track_inventory, created_at, updated_at)
VALUES (
  'a9999999-9999-9999-9999-999999999999',
  '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a',
  'ec786275-c107-4b5b-88b8-0d2aa389004f', -- Ron Category ID
  'Ron Viejo de Caldas 3 Años (Botella)',
  'Botella entera de Ron Viejo de Caldas 3 Años de 750ml.',
  'RON-CAL-3-B',
  90000.00,
  0.19,
  'BOTTLE',
  true,
  true,
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- 3. Asignar Stock Inicial (50 unidades) para la Sucursal Principal de Sandoná
INSERT INTO stock_items (id, tenant_id, branch_id, product_id, quantity, updated_at)
VALUES
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'a1111111-1111-1111-1111-111111111111', 50.00, now()),
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'a2222222-2222-2222-2222-222222222222', 50.00, now()),
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'a3333333-3333-3333-3333-333333333333', 50.00, now()),
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'a4444444-4444-4444-4444-444444444444', 50.00, now()),
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'a5555555-5555-5555-5555-555555555555', 50.00, now()),
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'a6666666-6666-6666-6666-666666666666', 50.00, now()),
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'a7777777-7777-7777-7777-777777777777', 50.00, now()),
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'a8888888-8888-8888-8888-888888888888', 50.00, now()),
  (gen_random_uuid(), '7e8e42fd-8d4b-4ef2-89fe-acaf0916646a', '8f56207f-9721-4783-bdf3-117c182e588f', 'a9999999-9999-9999-9999-999999999999', 50.00, now())
ON CONFLICT DO NOTHING;
