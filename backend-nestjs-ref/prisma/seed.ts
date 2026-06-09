// ════════════════════════════════════════════════════════════
// Admiral Pro — Seed inicial
// Crea tenant, sucursal, usuarios, categorías, productos demo
// ════════════════════════════════════════════════════════════

import { PrismaClient, UserRole, ZoneType, LoyaltyLevel, PromoType, ProductUnit } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🥃 Seeding Admiral Pro...');

  const tenantSlug = process.env.DEFAULT_TENANT_SLUG || 'admiral';
  const tenantName = process.env.DEFAULT_TENANT_NAME || 'Admiral Whiskería';

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName },
    create: {
      slug: tenantSlug,
      name: tenantName,
      config: {
        currency: 'COP',
        taxRate: 0.19,
        loyalty: {
          pointsPerCurrency: 0.01,
          silverThreshold: 500_000,
          goldThreshold: 2_000_000,
          platinumThreshold: 5_000_000,
        },
        theme: { primary: '#D4A535', accent: '#0C1120' },
      },
    },
  });

  const branch = await prisma.branch.upsert({
    where: { id: 'branch-main' },
    update: {},
    create: {
      id: 'branch-main',
      tenantId: tenant.id,
      name: 'Sucursal Principal',
      address: 'Calle 85 #13-25, Bogotá',
      timezone: 'America/Bogota',
    },
  });

  // Zonas
  const zoneBar = await prisma.zone.upsert({
    where: { id: 'zone-bar' },
    update: {},
    create: { id: 'zone-bar', tenantId: tenant.id, branchId: branch.id, name: 'Barra', type: ZoneType.BAR },
  });
  const zoneFloor = await prisma.zone.upsert({
    where: { id: 'zone-floor' },
    update: {},
    create: { id: 'zone-floor', tenantId: tenant.id, branchId: branch.id, name: 'Piso Principal', type: ZoneType.FLOOR },
  });
  const zoneVip = await prisma.zone.upsert({
    where: { id: 'zone-vip' },
    update: {},
    create: { id: 'zone-vip', tenantId: tenant.id, branchId: branch.id, name: 'Sala Ámbar VIP', type: ZoneType.VIP },
  });

  // Mesas
  for (let i = 1; i <= 8; i++) {
    await prisma.table.upsert({
      where: { branchId_number: { branchId: branch.id, number: String(i) } },
      update: {},
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        zoneId: zoneFloor.id,
        number: String(i),
        capacity: i <= 4 ? 4 : 6,
      },
    });
  }
  await prisma.table.upsert({
    where: { branchId_number: { branchId: branch.id, number: 'B1' } },
    update: {},
    create: { tenantId: tenant.id, branchId: branch.id, zoneId: zoneBar.id, number: 'B1', capacity: 8 },
  });
  await prisma.table.upsert({
    where: { branchId_number: { branchId: branch.id, number: 'VIP-A' } },
    update: {},
    create: { tenantId: tenant.id, branchId: branch.id, zoneId: zoneVip.id, number: 'VIP-A', capacity: 12 },
  });

  // ── Usuarios (defaults solo en dev/seed inicial) ───────────
  // En producción cambia las contraseñas y PINs vía panel admin
  const seedUsers = [
    { email: 'admin@admiral.co', name: 'Administrador', role: UserRole.ADMIN, pin: '1234', password: 'Admiral2026!' },
    { email: 'barista@admiral.co', name: 'Barista', role: UserRole.BARISTA, pin: '1111', password: 'Barista2026!' },
    { email: 'mesero@admiral.co', name: 'Mesero', role: UserRole.WAITER, pin: '2222', password: 'Mesero2026!' },
    { email: 'mesero2@admiral.co', name: 'Mesero 2', role: UserRole.WAITER, pin: '2233', password: 'Mesero2026!' },
    { email: 'cajero@admiral.co', name: 'Cajero', role: UserRole.CASHIER, pin: '3333', password: 'Cajero2026!' },
  ];

  for (const u of seedUsers) {
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: await bcrypt.hash(u.password, 12),
        pinHash: await bcrypt.hash(u.pin, 12),
      },
    });
  }

  // ── Categorías ─────────────────────────────────────────────
  const categoriesData = [
    { slug: 'cocteles', name: 'Cocteles', icon: '🍹', sortOrder: 1 },
    { slug: 'whisky', name: 'Whisky', icon: '🥃', sortOrder: 2 },
    { slug: 'ron', name: 'Ron', icon: '🍶', sortOrder: 3 },
    { slug: 'cervezas', name: 'Cervezas', icon: '🍺', sortOrder: 4 },
    { slug: 'shots', name: 'Shots', icon: '🥃', sortOrder: 5 },
    { slug: 'combos', name: 'Combos', icon: '📦', sortOrder: 6 },
    { slug: 'energizantes', name: 'Energizantes', icon: '⚡', sortOrder: 7 },
    { slug: 'snacks', name: 'Snacks', icon: '🥜', sortOrder: 8 },
  ];

  const categories: Record<string, string> = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: c.slug } },
      update: { name: c.name, icon: c.icon, sortOrder: c.sortOrder },
      create: { tenantId: tenant.id, ...c },
    });
    categories[c.slug] = cat.id;
  }

  // ── Productos ──────────────────────────────────────────────
  const productsData = [
    { name: 'Mojito clásico', cat: 'cocteles', price: 18000, cost: 6000, sku: 'COC-MOJ' },
    { name: 'Old Fashioned', cat: 'cocteles', price: 24000, cost: 8000, sku: 'COC-OLD' },
    { name: 'Negroni', cat: 'cocteles', price: 22000, cost: 7500, sku: 'COC-NEG' },
    { name: 'Whisky Sour', cat: 'cocteles', price: 20000, cost: 7000, sku: 'COC-WHS' },
    { name: 'Daiquiri de fresa', cat: 'cocteles', price: 18000, cost: 5500, sku: 'COC-DAI' },
    { name: 'Glenfiddich 12 años', cat: 'whisky', price: 35000, cost: 18000, sku: 'WHI-GLE-12', unit: ProductUnit.SHOT },
    { name: 'Johnnie Walker Black', cat: 'whisky', price: 28000, cost: 14000, sku: 'WHI-JWB', unit: ProductUnit.SHOT },
    { name: 'Chivas Regal 12', cat: 'whisky', price: 30000, cost: 15000, sku: 'WHI-CHI-12', unit: ProductUnit.SHOT },
    { name: 'The Macallan 12', cat: 'whisky', price: 48000, cost: 25000, sku: 'WHI-MAC-12', unit: ProductUnit.SHOT },
    { name: "Jack Daniel's", cat: 'whisky', price: 26000, cost: 13000, sku: 'WHI-JD', unit: ProductUnit.SHOT },
    { name: 'Havana Club 7', cat: 'ron', price: 26000, cost: 12000, sku: 'RON-HAV-7', unit: ProductUnit.SHOT },
    { name: 'Ron Medellín Añejo', cat: 'ron', price: 22000, cost: 10000, sku: 'RON-MED', unit: ProductUnit.SHOT },
    { name: 'Corona', cat: 'cervezas', price: 9000, cost: 3500, sku: 'CER-COR', unit: ProductUnit.BOTTLE },
    { name: 'Club Colombia', cat: 'cervezas', price: 8000, cost: 3000, sku: 'CER-CLU', unit: ProductUnit.BOTTLE },
    { name: 'Heineken', cat: 'cervezas', price: 10000, cost: 4000, sku: 'CER-HEI', unit: ProductUnit.BOTTLE },
    { name: 'Shot de tequila', cat: 'shots', price: 10000, cost: 3500, sku: 'SHO-TEQ', unit: ProductUnit.SHOT },
    { name: 'Shot de aguardiente', cat: 'shots', price: 8000, cost: 2500, sku: 'SHO-AGU', unit: ProductUnit.SHOT },
    { name: 'Shot de vodka', cat: 'shots', price: 9000, cost: 3000, sku: 'SHO-VOD', unit: ProductUnit.SHOT },
    { name: 'Balde 6 Coronas', cat: 'combos', price: 46000, cost: 21000, sku: 'COM-COR-6', isCombo: true },
    { name: 'Botella + 4 Redbull', cat: 'combos', price: 120000, cost: 60000, sku: 'COM-BOT-RB', isCombo: true },
    { name: 'Red Bull', cat: 'energizantes', price: 8000, cost: 3500, sku: 'ENE-RB' },
    { name: 'Monster Energy', cat: 'energizantes', price: 9000, cost: 4000, sku: 'ENE-MON' },
    { name: 'Maní mixto', cat: 'snacks', price: 7000, cost: 2000, sku: 'SNA-MAN' },
    { name: 'Tabla de quesos', cat: 'snacks', price: 28000, cost: 12000, sku: 'SNA-TAB' },
    { name: 'Papas fritas', cat: 'snacks', price: 12000, cost: 4000, sku: 'SNA-PAP' },
  ];

  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: p.sku } },
      update: { basePrice: p.price, costPrice: p.cost },
      create: {
        tenantId: tenant.id,
        categoryId: categories[p.cat],
        name: p.name,
        basePrice: p.price,
        costPrice: p.cost,
        sku: p.sku,
        unit: p.unit ?? ProductUnit.UNIT,
        isCombo: p.isCombo ?? false,
        minStock: 5,
      },
    });

    // Stock inicial demo
    await prisma.stockItem.upsert({
      where: { branchId_productId: { branchId: branch.id, productId: product.id } },
      update: {},
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        productId: product.id,
        quantity: p.isCombo ? 0 : 50,
      },
    });
  }

  // ── Happy Hour de cocteles (lun-vie 18-20h) ────────────────
  const cocktailProducts = await prisma.product.findMany({
    where: { tenantId: tenant.id, category: { slug: 'cocteles' } },
    select: { id: true },
  });

  await prisma.promotionRule.upsert({
    where: { id: 'promo-hh-cocteles' },
    update: {},
    create: {
      id: 'promo-hh-cocteles',
      tenantId: tenant.id,
      name: 'Happy Hour Cocteles 2×1',
      description: 'Lunes a viernes 6 a 8 PM',
      type: PromoType.HAPPY_HOUR,
      discountValue: 50,
      startTime: '18:00',
      endTime: '20:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      stackable: false,
      active: true,
      products: { create: cocktailProducts.map((p) => ({ productId: p.id })) },
    },
  });

  // ── Cupón de bienvenida ────────────────────────────────────
  await prisma.coupon.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'BIENVENIDA10' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'BIENVENIDA10',
      discountType: 'percentage',
      value: 10,
      maxUses: 500,
      active: true,
    },
  });

  // ── Clientes demo ──────────────────────────────────────────
  const carlos = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: '+573102345678' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Carlos Medina',
      phone: '+573102345678',
      email: 'carlos@ejemplo.co',
      loyaltyLevel: LoyaltyLevel.GOLD,
      pointsBalance: 4820,
      totalSpent: 2_400_000,
      visitCount: 34,
    },
  });
  await prisma.whatsAppConsent.upsert({
    where: { id: 'consent-carlos' },
    update: {},
    create: { id: 'consent-carlos', customerId: carlos.id, type: 'marketing', channel: 'pos', active: true },
  });

  await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: '+573158765432' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Ana Restrepo',
      phone: '+573158765432',
      loyaltyLevel: LoyaltyLevel.SILVER,
      pointsBalance: 1240,
      totalSpent: 820_000,
      visitCount: 12,
    },
  });

  console.log('✅ Seed completo');
  console.log('   Admin:   admin@admiral.co       / pwd Admiral2026!   / PIN 1234');
  console.log('   Barista: barista@admiral.co     / pwd Barista2026!   / PIN 1111');
  console.log('   Mesero:  mesero@admiral.co      / pwd Mesero2026!    / PIN 2222');
  console.log('   Cajero:  cajero@admiral.co      / pwd Cajero2026!    / PIN 3333');
  console.log('   ⚠ Cambia estas credenciales en producción desde el panel admin.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
