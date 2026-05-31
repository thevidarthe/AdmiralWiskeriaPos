-- ════════════════════════════════════════════════════════════
-- Migración 009: Revertir Ajustes de Catálogo y Reglas IFTTT
-- ════════════════════════════════════════════════════════════

DELETE FROM stock_items WHERE product_id IN (
  SELECT id FROM products WHERE sku IN ('SHO-NAR-AZU-M', 'SHO-AMA-MAN-M', 'SHO-AMA-MAN-B', 'SHO-CHA-ART', 'RON-CAL-3-M')
);
DELETE FROM products WHERE sku IN ('SHO-NAR-AZU-M', 'SHO-AMA-MAN-M', 'SHO-AMA-MAN-B', 'SHO-CHA-ART', 'RON-CAL-3-M');
