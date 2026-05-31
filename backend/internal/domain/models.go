// Package domain — structs mapeados a tablas SQL.
//
// 📚 Convención GORM:
//   - El nombre de la tabla es plural en snake_case (Tenant → tenants)
//   - El campo ID con tipo string + tag uuid es la PK
//   - CreatedAt/UpdatedAt son automáticos
//   - Pointers (*time.Time) representan campos NULLABLE
//   - decimal.Decimal viene de shopspring/decimal — preciso para dinero
package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// ════════════════════════════════════════════════════════════
// Tenancy
// ════════════════════════════════════════════════════════════

type Tenant struct {
	ID        string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Slug      string         `gorm:"uniqueIndex;not null" json:"slug"`
	Name      string         `gorm:"not null" json:"name"`
	Config    JSONB          `gorm:"type:jsonb;default:'{}'::jsonb" json:"config"`
	Active    bool           `gorm:"default:true" json:"active"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Branch struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID  string    `gorm:"type:uuid;not null;index" json:"tenantId"`
	Name      string    `gorm:"not null" json:"name"`
	Address   string    `json:"address,omitempty"`
	Timezone  string    `gorm:"default:'America/Bogota'" json:"timezone"`
	Settings  JSONB     `gorm:"type:jsonb;default:'{}'::jsonb" json:"settings"`
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"createdAt"`
}

// ════════════════════════════════════════════════════════════
// Usuarios
// ════════════════════════════════════════════════════════════

type User struct {
	ID             string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID       string     `gorm:"type:uuid;not null;uniqueIndex:idx_users_tenant_email" json:"tenantId"`
	Email          string     `gorm:"not null;uniqueIndex:idx_users_tenant_email" json:"email"`
	Name           string     `gorm:"not null" json:"name"`
	Phone          string     `json:"phone,omitempty"`
	AvatarURL      string     `json:"avatarUrl,omitempty"`
	PasswordHash   string     `gorm:"not null" json:"-"`
	PINHash        string     `gorm:"not null" json:"-"`
	Role           UserRole   `gorm:"type:varchar(20);default:'WAITER'" json:"role"`
	Active         bool       `gorm:"default:true" json:"active"`
	FailedAttempts int        `gorm:"default:0" json:"-"`
	LockedUntil    *time.Time `json:"-"`
	LastLoginAt    *time.Time `json:"lastLoginAt,omitempty"`
	MFASecret      string     `gorm:"column:mfa_secret" json:"-"`
	MFAEnabled     bool       `gorm:"column:mfa_enabled;default:false" json:"mfaEnabled"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

// ════════════════════════════════════════════════════════════
// Zonas y mesas
// ════════════════════════════════════════════════════════════

type Zone struct {
	ID       string   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID string   `gorm:"type:uuid;not null;index" json:"tenantId"`
	BranchID string   `gorm:"type:uuid;not null;index" json:"branchId"`
	Name     string   `gorm:"not null" json:"name"`
	Type     ZoneType `gorm:"type:varchar(20);default:'FLOOR'" json:"type"`
	Active   bool     `gorm:"default:true" json:"active"`
}

type Table struct {
	ID       string      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID string      `gorm:"type:uuid;not null;index" json:"tenantId"`
	BranchID string      `gorm:"type:uuid;not null;uniqueIndex:idx_tables_branch_number" json:"branchId"`
	ZoneID   string      `gorm:"type:uuid;not null" json:"zoneId"`
	Number   string      `gorm:"not null;uniqueIndex:idx_tables_branch_number" json:"number"`
	Capacity int         `gorm:"default:4" json:"capacity"`
	Status   TableStatus `gorm:"type:varchar(20);default:'FREE'" json:"status"`

	Zone *Zone `gorm:"foreignKey:ZoneID" json:"zone,omitempty"`
}

// ════════════════════════════════════════════════════════════
// QR
// ════════════════════════════════════════════════════════════

type QRCode struct {
	ID        string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID  string     `gorm:"type:uuid;not null;index" json:"tenantId"`
	BranchID  string     `gorm:"type:uuid;not null;index" json:"branchId"`
	TableID   string     `gorm:"type:uuid;not null;index" json:"tableId"`
	Token     string     `gorm:"uniqueIndex;not null" json:"token"`
	SvgData   string     `gorm:"type:text" json:"svgData,omitempty"`
	Active    bool       `gorm:"default:true" json:"active"`
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`

	Table *Table `gorm:"foreignKey:TableID" json:"table,omitempty"`
}

// ════════════════════════════════════════════════════════════
// Categorías y productos
// ════════════════════════════════════════════════════════════

type Category struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID  string    `gorm:"type:uuid;not null;uniqueIndex:idx_categories_tenant_slug" json:"tenantId"`
	ParentID  *string   `gorm:"type:uuid" json:"parentId,omitempty"`
	Name      string    `gorm:"not null" json:"name"`
	Slug      string    `gorm:"not null;uniqueIndex:idx_categories_tenant_slug" json:"slug"`
	Icon      string    `json:"icon,omitempty"`
	Color     string    `json:"color,omitempty"`
	SortOrder int       `gorm:"default:0" json:"sortOrder"`
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"createdAt"`
}

type Product struct {
	ID             string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID       string          `gorm:"type:uuid;not null;index" json:"tenantId"`
	CategoryID     string          `gorm:"type:uuid;not null;index" json:"categoryId"`
	Name           string          `gorm:"not null" json:"name"`
	Description    string          `gorm:"type:text" json:"description,omitempty"`
	SKU            string          `gorm:"uniqueIndex:idx_products_tenant_sku" json:"sku,omitempty"`
	Barcode        string          `json:"barcode,omitempty"`
	BasePrice      decimal.Decimal `gorm:"type:numeric(12,2);not null" json:"basePrice"`
	CostPrice      *decimal.Decimal `gorm:"type:numeric(12,2)" json:"costPrice,omitempty"`
	TaxRate        decimal.Decimal `gorm:"type:numeric(5,4);default:0.19" json:"taxRate"`
	Unit           ProductUnit     `gorm:"type:varchar(10);default:'UNIT'" json:"unit"`
	UnitSize       *decimal.Decimal `gorm:"type:numeric(10,2)" json:"unitSize,omitempty"`
	AlcoholVolume  *decimal.Decimal `gorm:"type:numeric(5,2)" json:"alcoholVolume,omitempty"`
	ImageURL       string          `json:"imageUrl,omitempty"`
	IsCombo        bool            `gorm:"default:false" json:"isCombo"`
	ComboItems     JSONB           `gorm:"type:jsonb" json:"comboItems,omitempty"`
	TrackInventory bool            `gorm:"default:true" json:"trackInventory"`
	MinStock       *decimal.Decimal `gorm:"type:numeric(10,2)" json:"minStock,omitempty"`
	Available      bool            `gorm:"default:true" json:"available"`
	SortOrder      int             `gorm:"default:0" json:"sortOrder"`
	Metadata       JSONB           `gorm:"type:jsonb;default:'{}'::jsonb" json:"metadata"`
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt"`

	Category *Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

// ════════════════════════════════════════════════════════════
// Inventario
// ════════════════════════════════════════════════════════════

type StockItem struct {
	ID        string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID  string          `gorm:"type:uuid;not null;index" json:"tenantId"`
	BranchID  string          `gorm:"type:uuid;not null;uniqueIndex:idx_stock_branch_product" json:"branchId"`
	ProductID string          `gorm:"type:uuid;not null;uniqueIndex:idx_stock_branch_product" json:"productId"`
	Quantity  decimal.Decimal `gorm:"type:numeric(12,2);default:0" json:"quantity"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

type InventoryMovement struct {
	ID            string           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID      string           `gorm:"type:uuid;not null;index" json:"tenantId"`
	BranchID      string           `gorm:"type:uuid;not null;index" json:"branchId"`
	ProductID     string           `gorm:"type:uuid;not null;index" json:"productId"`
	MovementType  MovementType     `gorm:"type:varchar(20);not null" json:"movementType"`
	Quantity      decimal.Decimal  `gorm:"type:numeric(12,2);not null" json:"quantity"`
	UnitCost      *decimal.Decimal `gorm:"type:numeric(12,2)" json:"unitCost,omitempty"`
	ReferenceType string           `json:"referenceType,omitempty"`
	ReferenceID   string           `gorm:"type:uuid" json:"referenceId,omitempty"`
	Notes         string           `gorm:"type:text" json:"notes,omitempty"`
	CreatedBy     string           `gorm:"type:uuid" json:"createdBy,omitempty"`
	CreatedAt     time.Time        `json:"createdAt"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

// ════════════════════════════════════════════════════════════
// Clientes y lealtad
// ════════════════════════════════════════════════════════════

type Customer struct {
	ID            string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID      string          `gorm:"type:uuid;not null;uniqueIndex:idx_customers_tenant_phone" json:"tenantId"`
	Name          string          `gorm:"not null" json:"name"`
	Phone         string          `gorm:"not null;uniqueIndex:idx_customers_tenant_phone" json:"phone"`
	Email         string          `json:"email,omitempty"`
	Birthday      *time.Time      `json:"birthday,omitempty"`
	LoyaltyLevel  LoyaltyLevel    `gorm:"type:varchar(20);default:'CLASSIC'" json:"loyaltyLevel"`
	PointsBalance int             `gorm:"default:0" json:"pointsBalance"`
	TotalSpent    decimal.Decimal `gorm:"type:numeric(14,2);default:0" json:"totalSpent"`
	VisitCount    int             `gorm:"default:0" json:"visitCount"`
	LastVisitAt   *time.Time      `json:"lastVisitAt,omitempty"`
	Notes         string          `gorm:"type:text" json:"notes,omitempty"`
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`

	Consents []WhatsAppConsent `gorm:"foreignKey:CustomerID" json:"consents,omitempty"`
}

type WhatsAppConsent struct {
	ID           string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CustomerID   string     `gorm:"type:uuid;not null;index" json:"customerId"`
	Type         string     `gorm:"not null" json:"type"`
	Channel      string     `gorm:"not null" json:"channel"`
	Active       bool       `gorm:"default:true" json:"active"`
	TermsVersion string     `gorm:"default:'v1'" json:"termsVersion"`
	ConsentedAt  time.Time  `gorm:"default:now()" json:"consentedAt"`
	RevokedAt    *time.Time `json:"revokedAt,omitempty"`
}

type LoyaltyTransaction struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CustomerID  string    `gorm:"type:uuid;not null;index" json:"customerId"`
	SaleID      *string   `gorm:"type:uuid" json:"saleId,omitempty"`
	PointsDelta int       `gorm:"not null" json:"pointsDelta"`
	Reason      string    `gorm:"not null" json:"reason"`
	CreatedAt   time.Time `json:"createdAt"`
}

// ════════════════════════════════════════════════════════════
// Turnos y ventas
// ════════════════════════════════════════════════════════════

type Shift struct {
	ID         string           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID   string           `gorm:"type:uuid;not null;index" json:"tenantId"`
	BranchID   string           `gorm:"type:uuid;not null;index" json:"branchId"`
	UserID     string           `gorm:"type:uuid;not null;index" json:"userId"`
	OpenedAt   time.Time        `gorm:"default:now()" json:"openedAt"`
	ClosedAt   *time.Time       `json:"closedAt,omitempty"`
	OpenFloat  decimal.Decimal  `gorm:"type:numeric(12,2);default:0" json:"openFloat"`
	CloseFloat *decimal.Decimal `gorm:"type:numeric(12,2)" json:"closeFloat,omitempty"`
	Notes      string           `gorm:"type:text" json:"notes,omitempty"`
}

type Sale struct {
	ID            string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID      string          `gorm:"type:uuid;not null;index" json:"tenantId"`
	BranchID      string          `gorm:"type:uuid;not null;index" json:"branchId"`
	TableID       *string         `gorm:"type:uuid;index" json:"tableId,omitempty"`
	ShiftID       *string         `gorm:"type:uuid" json:"shiftId,omitempty"`
	UserID        *string         `gorm:"type:uuid;index" json:"userId,omitempty"`
	CustomerID    *string         `gorm:"type:uuid;index" json:"customerId,omitempty"`
	Name          string          `json:"name,omitempty"`
	Status        SaleStatus      `gorm:"type:varchar(20);default:'OPEN';index" json:"status"`
	Source        SaleSource      `gorm:"type:varchar(20);default:'POS'" json:"source"`
	Subtotal      decimal.Decimal `gorm:"type:numeric(12,2);default:0" json:"subtotal"`
	DiscountTotal decimal.Decimal `gorm:"type:numeric(12,2);default:0" json:"discountTotal"`
	TaxTotal      decimal.Decimal `gorm:"type:numeric(12,2);default:0" json:"taxTotal"`
	TipAmount     decimal.Decimal `gorm:"type:numeric(12,2);default:0" json:"tipAmount"`
	GrandTotal    decimal.Decimal `gorm:"type:numeric(12,2);default:0" json:"grandTotal"`
	Notes         string          `gorm:"type:text" json:"notes,omitempty"`
	OpenedAt      time.Time       `gorm:"default:now()" json:"openedAt"`
	ClosedAt      *time.Time      `json:"closedAt,omitempty"`

	Items    []SaleItem `gorm:"foreignKey:SaleID" json:"items,omitempty"`
	Payments []Payment  `gorm:"foreignKey:SaleID" json:"payments,omitempty"`
	Customer *Customer  `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Table    *Table     `gorm:"foreignKey:TableID" json:"table,omitempty"`
	Split    *SaleSplit `gorm:"foreignKey:SaleID" json:"split,omitempty"`
}

type SaleItem struct {
	ID           string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID     string          `gorm:"type:uuid;not null;index" json:"tenantId"`
	SaleID       string          `gorm:"type:uuid;not null;index" json:"saleId"`
	ProductID    string          `gorm:"type:uuid;not null;index" json:"productId"`
	ProductName  string          `gorm:"not null" json:"productName"`
	Quantity     decimal.Decimal `gorm:"type:numeric(10,2);not null" json:"quantity"`
	UnitPrice    decimal.Decimal `gorm:"type:numeric(12,2);not null" json:"unitPrice"`
	Discount     decimal.Decimal `gorm:"type:numeric(12,2);default:0" json:"discount"`
	TaxRate      decimal.Decimal `gorm:"type:numeric(5,4);default:0.19" json:"taxRate"`
	LineTotal    decimal.Decimal `gorm:"type:numeric(12,2);not null" json:"lineTotal"`
	PromoApplied string          `json:"promoApplied,omitempty"`
	Notes        string          `gorm:"type:text" json:"notes,omitempty"`
	CreatedAt    time.Time       `json:"createdAt"`
}

type Payment struct {
	ID        string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID  string          `gorm:"type:uuid;not null;index" json:"tenantId"`
	SaleID    string          `gorm:"type:uuid;not null;index" json:"saleId"`
	Method    PaymentMethod   `gorm:"type:varchar(20);not null" json:"method"`
	Amount    decimal.Decimal `gorm:"type:numeric(12,2);not null" json:"amount"`
	Status    PaymentStatus   `gorm:"type:varchar(20);default:'COMPLETED'" json:"status"`
	Reference string          `json:"reference,omitempty"`
	CreatedAt time.Time       `json:"createdAt"`
}

type SaleSplit struct {
	ID          string      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID    string      `gorm:"type:uuid;not null;index" json:"tenantId"`
	SaleID      string      `gorm:"type:uuid;not null;uniqueIndex" json:"saleId"`
	TotalShares int         `gorm:"default:1" json:"totalShares"`
	Status      string      `gorm:"type:varchar(20);default:'PENDING'" json:"status"`
	CreatedAt   time.Time   `json:"createdAt"`
	UpdatedAt   time.Time   `json:"updatedAt"`

	Shares      []SaleShare `gorm:"foreignKey:SaleSplitID;constraint:OnDelete:CASCADE" json:"shares,omitempty"`
}

type SaleShare struct {
	ID          string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SaleSplitID string          `gorm:"type:uuid;not null;index" json:"saleSplitId"`
	CustomerID  *string         `gorm:"type:uuid" json:"customerId,omitempty"`
	Name        string          `gorm:"type:varchar(100);not null" json:"name"`
	Phone       string          `gorm:"type:varchar(20);not null" json:"phone"`
	ShareAmount decimal.Decimal `gorm:"type:numeric(12,2);not null" json:"shareAmount"`
	Status      string          `gorm:"type:varchar(20);default:'PENDING'" json:"status"`
	PaymentID   *string         `gorm:"type:uuid" json:"paymentId,omitempty"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

type Rule struct {
	ID          string       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID    string       `gorm:"type:uuid;not null;index" json:"tenantId"`
	Name        string       `gorm:"type:varchar(150);not null" json:"name"`
	TriggerType string       `gorm:"type:varchar(50);not null;index" json:"triggerType"` // e.g., "weather.changed"
	ConditionJS string       `gorm:"type:text" json:"conditionJs"`                       // Javascript condition code
	Active      bool         `gorm:"default:true" json:"active"`
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`

	Actions     []RuleAction `gorm:"foreignKey:RuleID;constraint:OnDelete:CASCADE" json:"actions,omitempty"`
}

type RuleAction struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	RuleID    string    `gorm:"type:uuid;not null;index" json:"ruleId"`
	Type      string    `gorm:"type:varchar(50);not null" json:"type"` // e.g., "whatsapp.webhook", "pos.apply_promo"
	Payload   JSONB     `gorm:"type:jsonb;default:'{}'::jsonb" json:"payload"`
	SortOrder int       `gorm:"default:0" json:"sortOrder"`
	CreatedAt time.Time `json:"createdAt"`
}

// ════════════════════════════════════════════════════════════
// Promociones y cupones
// ════════════════════════════════════════════════════════════

type PromotionRule struct {
	ID             string           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID       string           `gorm:"type:uuid;not null;index" json:"tenantId"`
	Name           string           `gorm:"not null" json:"name"`
	Description    string           `gorm:"type:text" json:"description,omitempty"`
	Type           PromoType        `gorm:"type:varchar(30);not null" json:"type"`
	DiscountValue  decimal.Decimal  `gorm:"type:numeric(8,2);not null" json:"discountValue"`
	StartTime      string           `gorm:"type:varchar(5)" json:"startTime,omitempty"`
	EndTime        string           `gorm:"type:varchar(5)" json:"endTime,omitempty"`
	DaysOfWeek     IntArray         `gorm:"type:int[]" json:"daysOfWeek"`
	MinOrderAmount *decimal.Decimal `gorm:"type:numeric(12,2)" json:"minOrderAmount,omitempty"`
	LoyaltyLevels  StringArray      `gorm:"type:text[]" json:"loyaltyLevels"`
	Stackable      bool             `gorm:"default:false" json:"stackable"`
	Active         bool             `gorm:"default:true" json:"active"`
	StartsAt       *time.Time       `json:"startsAt,omitempty"`
	EndsAt         *time.Time       `json:"endsAt,omitempty"`
	CreatedAt      time.Time        `json:"createdAt"`

	Products []PromotionRuleProduct `gorm:"foreignKey:RuleID" json:"products,omitempty"`
}

type PromotionRuleProduct struct {
	RuleID    string `gorm:"type:uuid;primaryKey" json:"ruleId"`
	ProductID string `gorm:"type:uuid;primaryKey" json:"productId"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

type Coupon struct {
	ID           string           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID     string           `gorm:"type:uuid;not null;uniqueIndex:idx_coupons_tenant_code" json:"tenantId"`
	Code         string           `gorm:"not null;uniqueIndex:idx_coupons_tenant_code" json:"code"`
	DiscountType string           `gorm:"not null" json:"discountType"`
	Value        decimal.Decimal  `gorm:"type:numeric(10,2);not null" json:"value"`
	MaxUses      *int             `json:"maxUses,omitempty"`
	UsedCount    int              `gorm:"default:0" json:"usedCount"`
	StartsAt     *time.Time       `json:"startsAt,omitempty"`
	ExpiresAt    *time.Time       `json:"expiresAt,omitempty"`
	Active       bool             `gorm:"default:true" json:"active"`
	CreatedAt    time.Time        `json:"createdAt"`
}

// ════════════════════════════════════════════════════════════
// Marca (Brand)
// ════════════════════════════════════════════════════════════

type BrandConfig struct {
	ID              string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID        string    `gorm:"type:uuid;not null;uniqueIndex" json:"tenantId"`
	BranchID        *string   `gorm:"type:uuid;index" json:"branchId,omitempty"`
	Name            string    `gorm:"not null" json:"name"`
	Description     string    `json:"description,omitempty"`
	LogoURL         string    `json:"logoUrl,omitempty"`
	PrimaryColor    string    `json:"primaryColor,omitempty"`
	SecondaryColor  string    `json:"secondaryColor,omitempty"`
	WhatsAppPhone   string    `json:"whatsappPhone,omitempty"`
	Email           string    `json:"email,omitempty"`
	Website         string    `json:"website,omitempty"`
	Address         string    `json:"address,omitempty"`
	Metadata        JSONB     `gorm:"type:jsonb;default:'{}'::jsonb" json:"metadata"`
	Active          bool      `gorm:"default:true" json:"active"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type WhatsAppMessageTemplate struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID  string    `gorm:"type:uuid;not null;index" json:"tenantId"`
	BranchID  *string   `gorm:"type:uuid;index" json:"branchId,omitempty"`
	Name      string    `gorm:"not null" json:"name"`
	Slug      string    `gorm:"not null;uniqueIndex:idx_wa_template_tenant_slug" json:"slug"`
	Category  string    `gorm:"not null;default:'MARKETING'" json:"category"`
	Language  string    `gorm:"default:'es'" json:"language"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	Variables JSONB     `gorm:"type:jsonb;default:'[]'::jsonb" json:"variables"`
	MetaID    string    `json:"metaId,omitempty"`
	Status    string    `gorm:"default:'DRAFT'" json:"status"`
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type WhatsAppPromotionCampaign struct {
	ID              string           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID        string           `gorm:"type:uuid;not null;index" json:"tenantId"`
	BranchID        *string          `gorm:"type:uuid;index" json:"branchId,omitempty"`
	PromotionID     string           `gorm:"type:uuid;not null;index" json:"promotionId"`
	Name            string           `gorm:"not null" json:"name"`
	TemplateID      string           `gorm:"type:uuid;not null" json:"templateId"`
	SegmentQuery    JSONB            `gorm:"type:jsonb" json:"segmentQuery"`
	Status          CampaignStatus   `gorm:"type:varchar(20);default:'DRAFT'" json:"status"`
	ScheduledAt     *time.Time       `json:"scheduledAt,omitempty"`
	SentAt          *time.Time       `json:"sentAt,omitempty"`
	TotalRecipients int              `gorm:"default:0" json:"totalRecipients"`
	TotalSent       int              `gorm:"default:0" json:"totalSent"`
	TotalDelivered  int              `gorm:"default:0" json:"totalDelivered"`
	TotalRead       int              `gorm:"default:0" json:"totalRead"`
	TotalFailed     int              `gorm:"default:0" json:"totalFailed"`
	TotalClicks     int              `gorm:"default:0" json:"totalClicks"`
	CreatedAt       time.Time        `json:"createdAt"`
	UpdatedAt       time.Time        `json:"updatedAt"`
}

// ════════════════════════════════════════════════════════════
// WhatsApp
// ════════════════════════════════════════════════════════════

type MessageTemplate struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID   string    `gorm:"type:uuid;not null;index" json:"tenantId"`
	Name       string    `gorm:"not null" json:"name"`
	WaID       string    `gorm:"not null" json:"waId"`
	Category   string    `gorm:"not null" json:"category"`
	Language   string    `gorm:"default:'es'" json:"language"`
	Components JSONB     `gorm:"type:jsonb" json:"components"`
	Active     bool      `gorm:"default:true" json:"active"`
	CreatedAt  time.Time `json:"createdAt"`
}

type Campaign struct {
	ID             string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID       string         `gorm:"type:uuid;not null;index" json:"tenantId"`
	BranchID       *string        `gorm:"type:uuid" json:"branchId,omitempty"`
	Name           string         `gorm:"not null" json:"name"`
	TemplateID     *string        `gorm:"type:uuid" json:"templateId,omitempty"`
	SegmentQuery   JSONB          `gorm:"type:jsonb;not null" json:"segmentQuery"`
	Status         CampaignStatus `gorm:"type:varchar(20);default:'DRAFT'" json:"status"`
	ScheduledAt    *time.Time     `json:"scheduledAt,omitempty"`
	SentAt         *time.Time     `json:"sentAt,omitempty"`
	TotalSent      int            `gorm:"default:0" json:"totalSent"`
	TotalDelivered int            `gorm:"default:0" json:"totalDelivered"`
	TotalRead      int            `gorm:"default:0" json:"totalRead"`
	TotalFailed    int            `gorm:"default:0" json:"totalFailed"`
	CreatedAt      time.Time      `json:"createdAt"`
}

type MessageLog struct {
	ID          string        `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CampaignID  *string       `gorm:"type:uuid;index" json:"campaignId,omitempty"`
	CustomerID  string        `gorm:"type:uuid;not null;index" json:"customerId"`
	WaMessageID string        `json:"waMessageId,omitempty"`
	Phone       string        `gorm:"not null" json:"phone"`
	Status      MessageStatus `gorm:"type:varchar(20);default:'QUEUED'" json:"status"`
	SentAt      *time.Time    `json:"sentAt,omitempty"`
	DeliveredAt *time.Time    `json:"deliveredAt,omitempty"`
	ReadAt      *time.Time    `json:"readAt,omitempty"`
	FailReason  string        `json:"failReason,omitempty"`
	CreatedAt   time.Time     `json:"createdAt"`
}

// ════════════════════════════════════════════════════════════
// Auditoría
// ════════════════════════════════════════════════════════════

type AuditLog struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID   string    `gorm:"type:uuid;not null;index" json:"tenantId"`
	UserID     *string   `gorm:"type:uuid;index" json:"userId,omitempty"`
	Action     string    `gorm:"not null" json:"action"`
	EntityType string    `gorm:"not null" json:"entityType"`
	EntityID   string    `gorm:"type:uuid" json:"entityId,omitempty"`
	Changes    JSONB     `gorm:"type:jsonb" json:"changes,omitempty"`
	IPAddress  string    `json:"ipAddress,omitempty"`
	UserAgent  string    `json:"userAgent,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

type StaffAttendance struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID  string    `gorm:"type:uuid;not null;index" json:"tenantId"`
	BranchID  string    `gorm:"type:uuid;not null;index" json:"branchId"`
	UserID    string    `gorm:"type:uuid;not null;index" json:"userId"`
	EventType string    `gorm:"type:varchar(20);not null" json:"eventType"` // "CLOCK_IN", "CLOCK_OUT"
	Timestamp time.Time `gorm:"default:now()" json:"timestamp"`
	PhotoURL  string    `gorm:"column:photo_url" json:"photoUrl,omitempty"`
	Latitude  *float64  `gorm:"column:latitude" json:"latitude,omitempty"`
	Longitude *float64  `gorm:"column:longitude" json:"longitude,omitempty"`
	IPAddress string    `gorm:"column:ip_address;type:varchar(60);not null" json:"ipAddress"`
	UserAgent string    `gorm:"column:user_agent;type:text" json:"userAgent,omitempty"`
	Metadata  JSONB     `gorm:"type:jsonb;default:'{}'::jsonb" json:"metadata"`
}

// NewID genera un UUID v4 (útil cuando GORM no lo hace por nosotros).
func NewID() string {
	return uuid.NewString()
}
