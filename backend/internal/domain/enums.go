// Package domain contiene las entidades de negocio mapeadas a tablas SQL.
//
// 📚 En Go no hay "clases" — usamos structs. Cada struct se mapea a una
// tabla SQL mediante tags `gorm:"..."` y `json:"..."`.
package domain

// UserRole — roles del staff.
type UserRole string

const (
	RoleAdmin   UserRole = "ADMIN"
	RoleManager UserRole = "MANAGER"
	RoleBarista UserRole = "BARISTA"
	RoleWaiter  UserRole = "WAITER"
	RoleCashier UserRole = "CASHIER"
)

// ZoneType — tipos de zona dentro de una sucursal.
type ZoneType string

const (
	ZoneBar     ZoneType = "BAR"
	ZoneFloor   ZoneType = "FLOOR"
	ZoneVIP     ZoneType = "VIP"
	ZoneTerrace ZoneType = "TERRACE"
)

// TableStatus — estado de una mesa.
type TableStatus string

const (
	TableFree        TableStatus = "FREE"
	TableOccupied    TableStatus = "OCCUPIED"
	TableReserved    TableStatus = "RESERVED"
	TableMaintenance TableStatus = "MAINTENANCE"
)

// ProductUnit — unidad de venta de un producto.
type ProductUnit string

const (
	UnitUnit   ProductUnit = "UNIT"
	UnitML     ProductUnit = "ML"
	UnitOZ     ProductUnit = "OZ"
	UnitGram   ProductUnit = "GRAM"
	UnitBottle ProductUnit = "BOTTLE"
	UnitGlass  ProductUnit = "GLASS"
	UnitShot   ProductUnit = "SHOT"
)

// SaleStatus — estado de una venta abierta.
type SaleStatus string

const (
	SaleOpen           SaleStatus = "OPEN"
	SalePendingPayment SaleStatus = "PENDING_PAYMENT"
	SalePaid           SaleStatus = "PAID"
	SaleCancelled      SaleStatus = "CANCELLED"
)

// SaleSource — quién originó la venta.
type SaleSource string

const (
	SourcePOS    SaleSource = "POS"
	SourceQR     SaleSource = "QR"
	SourceWaiter SaleSource = "WAITER"
)

// PaymentMethod — método de pago.
type PaymentMethod string

const (
	PayCash      PaymentMethod = "CASH"
	PayCard      PaymentMethod = "CARD"
	PayTransfer  PaymentMethod = "TRANSFER"
	PayNequi     PaymentMethod = "NEQUI"
	PayDaviplata PaymentMethod = "DAVIPLATA"
	PayPSE       PaymentMethod = "PSE"
	PayMixed     PaymentMethod = "MIXED"
)

// PaymentStatus — estado de un pago.
type PaymentStatus string

const (
	PaymentPending   PaymentStatus = "PENDING"
	PaymentCompleted PaymentStatus = "COMPLETED"
	PaymentRefunded  PaymentStatus = "REFUNDED"
	PaymentFailed    PaymentStatus = "FAILED"
)

// MovementType — tipo de movimiento de inventario.
type MovementType string

const (
	MovInPurchase    MovementType = "IN_PURCHASE"
	MovInReturn      MovementType = "IN_RETURN"
	MovInAdjustment  MovementType = "IN_ADJUSTMENT"
	MovInTransfer    MovementType = "IN_TRANSFER"
	MovOutSale       MovementType = "OUT_SALE"
	MovOutWaste      MovementType = "OUT_WASTE"
	MovOutTransfer   MovementType = "OUT_TRANSFER"
	MovOutAdjustment MovementType = "OUT_ADJUSTMENT"
	MovCount         MovementType = "COUNT"
)

// LoyaltyLevel — nivel de fidelidad del cliente.
type LoyaltyLevel string

const (
	LoyaltyClassic  LoyaltyLevel = "CLASSIC"
	LoyaltySilver   LoyaltyLevel = "SILVER"
	LoyaltyGold     LoyaltyLevel = "GOLD"
	LoyaltyPlatinum LoyaltyLevel = "PLATINUM"
)

// PromoType — tipo de regla promocional.
type PromoType string

const (
	PromoHappyHour       PromoType = "HAPPY_HOUR"
	PromoCombo           PromoType = "COMBO"
	PromoFixedDiscount   PromoType = "FIXED_DISCOUNT"
	PromoPercentDiscount PromoType = "PERCENTAGE_DISCOUNT"
)

// CampaignStatus — estado de una campaña de WhatsApp.
type CampaignStatus string

const (
	CampaignDraft     CampaignStatus = "DRAFT"
	CampaignScheduled CampaignStatus = "SCHEDULED"
	CampaignSending   CampaignStatus = "SENDING"
	CampaignSent      CampaignStatus = "SENT"
	CampaignCancelled CampaignStatus = "CANCELLED"
)

// MessageStatus — estado de un mensaje individual de WhatsApp.
type MessageStatus string

const (
	MsgQueued    MessageStatus = "QUEUED"
	MsgSent      MessageStatus = "SENT"
	MsgDelivered MessageStatus = "DELIVERED"
	MsgRead      MessageStatus = "READ"
	MsgFailed    MessageStatus = "FAILED"
	MsgOptOut    MessageStatus = "OPT_OUT"
)
