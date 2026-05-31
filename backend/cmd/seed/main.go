// cmd/seed — datos iniciales para entornos nuevos.
// Idempotente: corre las veces que quieras sin duplicar nada.
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/admiral/admiral-pro/internal/auth"
	"github.com/admiral/admiral-pro/internal/config"
	"github.com/admiral/admiral-pro/internal/db"
	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	gdb, err := db.Open(ctx, cfg.DatabaseURL, false)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close(gdb)

	fmt.Println("🥃 Seed Admiral Pro…")

	tenant := upsertTenant(gdb, cfg.DefaultTenantSlug, cfg.DefaultTenantName)
	branch := upsertBranch(gdb, tenant.ID, "Sucursal Principal")
	zoneFloor := upsertZone(gdb, tenant.ID, branch.ID, "Piso Principal", domain.ZoneFloor)
	zoneBar := upsertZone(gdb, tenant.ID, branch.ID, "Barra", domain.ZoneBar)
	zoneVip := upsertZone(gdb, tenant.ID, branch.ID, "Sala Ámbar VIP", domain.ZoneVIP)

	// Mesas
	for i := 1; i <= 8; i++ {
		upsertTable(gdb, tenant.ID, branch.ID, zoneFloor.ID, fmt.Sprintf("%d", i), capacityOf(i))
	}
	upsertTable(gdb, tenant.ID, branch.ID, zoneBar.ID, "B1", 8)
	upsertTable(gdb, tenant.ID, branch.ID, zoneVip.ID, "VIP-A", 12)

	// Usuarios (passwords/PINs por defecto SOLO para entornos nuevos)
	seedUsers := []seedUser{
		{Email: "admin@admiral.co", Name: "Administrador", Role: domain.RoleAdmin, Pwd: "Admiral2026!", PIN: "1234"},
		{Email: "andres@admiral.co", Name: "Andrés Ramírez", Role: domain.RoleBarista, Pwd: "Barista2026!", PIN: "1111"},
		{Email: "juliana@admiral.co", Name: "Juliana Pérez", Role: domain.RoleWaiter, Pwd: "Mesero2026!", PIN: "2222"},
		{Email: "camila@admiral.co", Name: "Camila Gómez", Role: domain.RoleWaiter, Pwd: "Mesero2026!", PIN: "2233"},
		{Email: "ricardo@admiral.co", Name: "Ricardo López", Role: domain.RoleCashier, Pwd: "Cajero2026!", PIN: "3333"},
	}
	for _, su := range seedUsers {
		upsertUser(gdb, tenant.ID, su)
	}

	// Categorías
	cats := []struct {
		Slug, Name, Icon string
		Order            int
	}{
		{"cocteles", "Cocteles", "🍹", 1},
		{"whisky", "Whisky", "🥃", 2},
		{"ron", "Ron", "🍶", 3},
		{"cervezas", "Cervezas", "🍺", 4},
		{"shots", "Shots", "🥃", 5},
		{"combos", "Combos", "📦", 6},
		{"energizantes", "Energizantes", "⚡", 7},
		{"snacks", "Snacks", "🥜", 8},
	}
	catIDs := map[string]string{}
	for _, c := range cats {
		cat := upsertCategory(gdb, tenant.ID, c.Slug, c.Name, c.Icon, c.Order)
		catIDs[c.Slug] = cat.ID
	}

	// Productos
	products := []seedProduct{
		{"Mojito clásico", "cocteles", 18000, 6000, "COC-MOJ", domain.UnitUnit, false},
		{"Old Fashioned", "cocteles", 24000, 8000, "COC-OLD", domain.UnitUnit, false},
		{"Negroni", "cocteles", 22000, 7500, "COC-NEG", domain.UnitUnit, false},
		{"Whisky Sour", "cocteles", 20000, 7000, "COC-WHS", domain.UnitUnit, false},
		{"Daiquiri de fresa", "cocteles", 18000, 5500, "COC-DAI", domain.UnitUnit, false},
		{"Glenfiddich 12", "whisky", 35000, 18000, "WHI-GLE-12", domain.UnitShot, false},
		{"Johnnie Walker Black", "whisky", 28000, 14000, "WHI-JWB", domain.UnitShot, false},
		{"Chivas Regal 12", "whisky", 30000, 15000, "WHI-CHI-12", domain.UnitShot, false},
		{"The Macallan 12", "whisky", 48000, 25000, "WHI-MAC-12", domain.UnitShot, false},
		{"Jack Daniel's", "whisky", 26000, 13000, "WHI-JD", domain.UnitShot, false},
		{"Havana Club 7", "ron", 26000, 12000, "RON-HAV-7", domain.UnitShot, false},
		{"Ron Medellín Añejo", "ron", 22000, 10000, "RON-MED", domain.UnitShot, false},
		{"Corona", "cervezas", 9000, 3500, "CER-COR", domain.UnitBottle, false},
		{"Club Colombia", "cervezas", 8000, 3000, "CER-CLU", domain.UnitBottle, false},
		{"Heineken", "cervezas", 10000, 4000, "CER-HEI", domain.UnitBottle, false},
		{"Shot tequila", "shots", 10000, 3500, "SHO-TEQ", domain.UnitShot, false},
		{"Shot aguardiente", "shots", 8000, 2500, "SHO-AGU", domain.UnitShot, false},
		{"Shot vodka", "shots", 9000, 3000, "SHO-VOD", domain.UnitShot, false},
		{"Balde 6 Coronas", "combos", 46000, 21000, "COM-COR-6", domain.UnitUnit, true},
		{"Botella + 4 Redbull", "combos", 120000, 60000, "COM-BOT-RB", domain.UnitUnit, true},
		{"Red Bull", "energizantes", 8000, 3500, "ENE-RB", domain.UnitUnit, false},
		{"Monster Energy", "energizantes", 9000, 4000, "ENE-MON", domain.UnitUnit, false},
		{"Maní mixto", "snacks", 7000, 2000, "SNA-MAN", domain.UnitUnit, false},
		{"Tabla de quesos", "snacks", 28000, 12000, "SNA-TAB", domain.UnitUnit, false},
		{"Papas fritas", "snacks", 12000, 4000, "SNA-PAP", domain.UnitUnit, false},
	}
	for _, p := range products {
		prod := upsertProduct(gdb, tenant.ID, catIDs[p.Cat], p)
		upsertStock(gdb, tenant.ID, branch.ID, prod.ID, 50)
	}

	// Happy Hour
	var cocktailProds []domain.Product
	gdb.Joins("JOIN categories c ON c.id = products.category_id").
		Where("products.tenant_id = ? AND c.slug = 'cocteles'", tenant.ID).
		Find(&cocktailProds)
	upsertPromo(gdb, tenant.ID, "Happy Hour Cocteles 2×1", cocktailProds)

	// Cupón
	upsertCoupon(gdb, tenant.ID, "BIENVENIDA10")

	// Cliente demo
	upsertCustomer(gdb, tenant.ID, "Carlos Medina", "+573102345678", domain.LoyaltyGold, 4820, 2_400_000, 34)
	upsertCustomer(gdb, tenant.ID, "Ana Restrepo", "+573158765432", domain.LoyaltySilver, 1240, 820_000, 12)

	fmt.Println("✅ Seed completo")
	fmt.Println()
	fmt.Println("  Accesos para entornos NUEVOS (cámbialos en producción):")
	fmt.Println("  admin@admiral.co       / Admiral2026!   / PIN 1234")
	fmt.Println("  andres@admiral.co      / Barista2026!   / PIN 1111")
	fmt.Println("  juliana@admiral.co     / Mesero2026!    / PIN 2222")
	fmt.Println("  ricardo@admiral.co     / Cajero2026!    / PIN 3333")
	os.Exit(0)
}

// ─── Helpers idempotentes ────────────────────────────────────

type seedUser struct {
	Email, Name string
	Role        domain.UserRole
	Pwd, PIN    string
}

type seedProduct struct {
	Name, Cat  string
	Price, Cost float64
	SKU         string
	Unit        domain.ProductUnit
	IsCombo     bool
}

func upsertTenant(db *gorm.DB, slug, name string) *domain.Tenant {
	var t domain.Tenant
	db.Where(&domain.Tenant{Slug: slug}).Attrs(&domain.Tenant{Name: name, Active: true}).FirstOrCreate(&t)
	return &t
}

func upsertBranch(db *gorm.DB, tenantID, name string) *domain.Branch {
	var b domain.Branch
	db.Where("tenant_id = ? AND name = ?", tenantID, name).
		Attrs(&domain.Branch{TenantID: tenantID, Name: name, Timezone: "America/Bogota", Active: true}).
		FirstOrCreate(&b)
	return &b
}

func upsertZone(db *gorm.DB, tenantID, branchID, name string, zType domain.ZoneType) *domain.Zone {
	var z domain.Zone
	db.Where("tenant_id = ? AND branch_id = ? AND name = ?", tenantID, branchID, name).
		Attrs(&domain.Zone{TenantID: tenantID, BranchID: branchID, Name: name, Type: zType, Active: true}).
		FirstOrCreate(&z)
	return &z
}

func upsertTable(db *gorm.DB, tenantID, branchID, zoneID, number string, capacity int) {
	var t domain.Table
	db.Where("branch_id = ? AND number = ?", branchID, number).
		Attrs(&domain.Table{
			TenantID: tenantID, BranchID: branchID, ZoneID: zoneID, Number: number, Capacity: capacity,
			Status: domain.TableFree,
		}).FirstOrCreate(&t)
}

func upsertUser(db *gorm.DB, tenantID string, su seedUser) {
	var u domain.User
	if err := db.Where("tenant_id = ? AND email = ?", tenantID, su.Email).First(&u).Error; err == nil {
		return // Ya existe, no sobreescribir credenciales
	}
	pwd, _ := auth.HashPassword(su.Pwd)
	pin, _ := auth.HashPassword(su.PIN)
	db.Create(&domain.User{
		TenantID:     tenantID,
		Email:        su.Email,
		Name:         su.Name,
		Role:         su.Role,
		PasswordHash: pwd,
		PINHash:      pin,
		Active:       true,
	})
}

func upsertCategory(db *gorm.DB, tenantID, slug, name, icon string, order int) *domain.Category {
	var c domain.Category
	db.Where("tenant_id = ? AND slug = ?", tenantID, slug).
		Attrs(&domain.Category{
			TenantID: tenantID, Slug: slug, Name: name, Icon: icon, SortOrder: order, Active: true,
		}).FirstOrCreate(&c)
	return &c
}

func upsertProduct(db *gorm.DB, tenantID, categoryID string, p seedProduct) *domain.Product {
	var existing domain.Product
	if err := db.Where("tenant_id = ? AND sku = ?", tenantID, p.SKU).First(&existing).Error; err == nil {
		return &existing
	}
	cp := decimal.NewFromFloat(p.Cost)
	minStock := decimal.NewFromInt(5)
	prod := domain.Product{
		TenantID:       tenantID,
		CategoryID:     categoryID,
		Name:           p.Name,
		SKU:            p.SKU,
		BasePrice:      decimal.NewFromFloat(p.Price),
		CostPrice:      &cp,
		TaxRate:        decimal.NewFromFloat(0.19),
		Unit:           p.Unit,
		IsCombo:        p.IsCombo,
		TrackInventory: !p.IsCombo,
		MinStock:       &minStock,
		Available:      true,
	}
	db.Create(&prod)
	return &prod
}

func upsertStock(db *gorm.DB, tenantID, branchID, productID string, qty float64) {
	var st domain.StockItem
	if err := db.Where("branch_id = ? AND product_id = ?", branchID, productID).First(&st).Error; err == nil {
		return
	}
	db.Create(&domain.StockItem{
		TenantID: tenantID, BranchID: branchID, ProductID: productID,
		Quantity: decimal.NewFromFloat(qty),
	})
}

func upsertPromo(db *gorm.DB, tenantID, name string, products []domain.Product) {
	var existing domain.PromotionRule
	if err := db.Where("tenant_id = ? AND name = ?", tenantID, name).First(&existing).Error; err == nil {
		return
	}
	r := domain.PromotionRule{
		TenantID:      tenantID,
		Name:          name,
		Description:   "Lunes a viernes 6 a 8 PM",
		Type:          domain.PromoHappyHour,
		DiscountValue: decimal.NewFromInt(50),
		StartTime:     "18:00",
		EndTime:       "20:00",
		DaysOfWeek:    domain.IntArray{1, 2, 3, 4, 5},
		LoyaltyLevels: domain.StringArray{},
		Stackable:     false,
		Active:        true,
	}
	if err := db.Create(&r).Error; err != nil {
		fmt.Printf("⚠️ Error creando promoción: %v\n", err)
		return
	}
	for _, p := range products {
		db.Clauses(clause.OnConflict{DoNothing: true}).
			Create(&domain.PromotionRuleProduct{RuleID: r.ID, ProductID: p.ID})
	}
}

func upsertCoupon(db *gorm.DB, tenantID, code string) {
	var c domain.Coupon
	if err := db.Where("tenant_id = ? AND code = ?", tenantID, code).First(&c).Error; err == nil {
		return
	}
	maxUses := 500
	db.Create(&domain.Coupon{
		TenantID: tenantID, Code: code,
		DiscountType: "percentage", Value: decimal.NewFromInt(10),
		MaxUses: &maxUses, Active: true,
	})
}

func upsertCustomer(db *gorm.DB, tenantID, name, phone string, level domain.LoyaltyLevel, points int, spent float64, visits int) {
	var c domain.Customer
	if err := db.Where("tenant_id = ? AND phone = ?", tenantID, phone).First(&c).Error; err == nil {
		return
	}
	db.Create(&domain.Customer{
		TenantID:      tenantID, Name: name, Phone: phone,
		LoyaltyLevel:  level, PointsBalance: points,
		TotalSpent:    decimal.NewFromFloat(spent),
		VisitCount:    visits,
	})
}

func capacityOf(i int) int {
	if i <= 4 {
		return 4
	}
	return 6
}
