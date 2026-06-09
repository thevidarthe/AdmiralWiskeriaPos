// Package pos — el corazón del POS: ventas abiertas, items, pagos.
//
// 📚 Patrón "Service Layer":
//   - Service contiene la lógica de negocio
//   - No conoce HTTP — recibe estructuras puras
//   - Los handlers (HTTP) traducen request→dto→service
package pos

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/admiral/admiral-pro/internal/event"
	"github.com/admiral/admiral-pro/internal/promotion"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

var (
	ErrTableBusy      = errors.New("la mesa ya tiene una venta abierta")
	ErrSaleNotFound   = errors.New("venta no encontrada")
	ErrSaleNotOpen    = errors.New("la venta no está abierta")
	ErrSalePaid       = errors.New("venta ya cobrada")
	ErrSaleCancelled  = errors.New("venta cancelada")
	ErrEmptySale      = errors.New("la venta no tiene items")
	ErrPaymentMismatch = errors.New("el monto pagado no coincide con el total")
)

type Service struct {
	db     *gorm.DB
	promos *promotion.Service
	bus    *event.Bus
}

func NewService(db *gorm.DB, promos *promotion.Service, bus *event.Bus) *Service {
	return &Service{db: db, promos: promos, bus: bus}
}

// ─── Tipos públicos ───────────────────────────────────────────

type OpenSaleInput struct {
	BranchID   string             `json:"branchId" validate:"required,uuid"`
	TableID    string             `json:"tableId,omitempty"`
	ShiftID    string             `json:"shiftId,omitempty"`
	CustomerID string             `json:"customerId,omitempty"`
	Name       string             `json:"name,omitempty"`
	Source     domain.SaleSource  `json:"source,omitempty"`
}

type AddItemsInput struct {
	Lines      []promotion.LineInput `json:"lines" validate:"required,min=1,dive"`
	CustomerID string                `json:"customerId,omitempty"`
}

type PaymentInput struct {
	Method    domain.PaymentMethod `json:"method" validate:"required,oneof=CASH CARD TRANSFER NEQUI DAVIPLATA PSE MIXED"`
	Amount    float64              `json:"amount" validate:"required,gt=0"`
	Reference string               `json:"reference,omitempty"`
}

type CloseSaleInput struct {
	Payments   []PaymentInput `json:"payments" validate:"required,min=1,dive"`
	TipAmount  float64        `json:"tipAmount,omitempty"`
	CouponCode string         `json:"couponCode,omitempty"`
}

// ─── Operaciones ──────────────────────────────────────────────

// OpenSale abre una venta. Si tableId está dado, marca la mesa OCUPADA y
// rechaza si ya tiene una venta abierta.
func (s *Service) OpenSale(ctx context.Context, tenantID, userID string, in OpenSaleInput) (*domain.Sale, error) {
	if in.TableID != "" {
		var existing domain.Sale
		err := s.db.WithContext(ctx).
			Where("tenant_id = ? AND table_id = ? AND status IN ?", tenantID, in.TableID,
				[]domain.SaleStatus{domain.SaleOpen, domain.SalePendingPayment}).
			First(&existing).Error
		if err == nil {
			return nil, fmt.Errorf("%w (saleId=%s)", ErrTableBusy, existing.ID)
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	source := in.Source
	if source == "" {
		source = domain.SourcePOS
	}

	sale := domain.Sale{
		TenantID: tenantID,
		BranchID: in.BranchID,
		UserID:   &userID,
		Source:   source,
		Status:   domain.SaleOpen,
	}
	if in.TableID != "" {
		sale.TableID = &in.TableID
	}
	if in.ShiftID != "" {
		sale.ShiftID = &in.ShiftID
	}
	if in.CustomerID != "" {
		sale.CustomerID = &in.CustomerID
	}
	if in.Name != "" {
		sale.Name = in.Name
	} else if in.TableID == "" {
		sale.Name = "Para llevar"
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&sale).Error; err != nil {
			return err
		}
		if in.TableID != "" {
			if err := tx.Model(&domain.Table{}).
				Where("id = ?", in.TableID).
				Update("status", domain.TableOccupied).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	// Recargar con relaciones
	_ = s.db.WithContext(ctx).Preload("Table").Preload("Customer").First(&sale, "id = ?", sale.ID).Error
	return &sale, nil
}

// GetSale carga la venta completa con items, payments, customer, table.
func (s *Service) GetSale(ctx context.Context, tenantID, saleID string) (*domain.Sale, error) {
	var sale domain.Sale
	err := s.db.WithContext(ctx).
		Preload("Items").
		Preload("Payments").
		Preload("Customer").
		Preload("Table").
		First(&sale, "id = ? AND tenant_id = ?", saleID, tenantID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSaleNotFound
		}
		return nil, err
	}
	return &sale, nil
}

// ListOpenSales lista todas las ventas activas de una sucursal.
func (s *Service) ListOpenSales(ctx context.Context, tenantID, branchID string) ([]domain.Sale, error) {
	var sales []domain.Sale
	err := s.db.WithContext(ctx).
		Preload("Items").
		Preload("Customer").
		Preload("Table").
		Where("tenant_id = ? AND branch_id = ? AND status IN ?", tenantID, branchID,
			[]domain.SaleStatus{domain.SaleOpen, domain.SalePendingPayment}).
		Order("opened_at asc").
		Find(&sales).Error
	return sales, err
}

// AddItems agrega líneas a la venta, calculando promociones.
func (s *Service) AddItems(ctx context.Context, tenantID, saleID, userID string, in AddItemsInput) (*domain.Sale, error) {
	sale, err := s.GetSale(ctx, tenantID, saleID)
	if err != nil {
		return nil, err
	}
	if sale.Status != domain.SaleOpen {
		return nil, ErrSaleNotOpen
	}

	customerID := in.CustomerID
	if customerID == "" && sale.CustomerID != nil {
		customerID = *sale.CustomerID
	}

	calculated, err := s.promos.Calculate(ctx, tenantID, in.Lines, customerID)
	if err != nil {
		return nil, err
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, l := range calculated {
			item := domain.SaleItem{
				TenantID:     tenantID,
				SaleID:       saleID,
				ProductID:    l.ProductID,
				ProductName:  l.ProductName,
				Quantity:     l.Quantity,
				UnitPrice:    l.UnitPrice,
				Discount:     l.Discount,
				TaxRate:      l.TaxRate,
				LineTotal:    l.LineTotal,
				PromoApplied: l.PromoApplied,
				Notes:        l.Notes,
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}
		return s.recalcTotals(ctx, tx, saleID)
	})
	if err != nil {
		return nil, err
	}

	updated, _ := s.GetSale(ctx, tenantID, saleID)
	s.bus.Emit("sale.itemsAdded", map[string]any{
		"tenantId":  tenantID,
		"saleId":    saleID,
		"addedBy":   userID,
		"sale":      updated,
	})
	return updated, nil
}

type AddItemsLine struct {
	ProductID string
	Quantity  float64
	UnitPrice decimal.Decimal
}

func (s *Service) AddItemsFromQR(ctx context.Context, tenantID, saleID string, lines []AddItemsLine) (*domain.Sale, error) {
	sale, err := s.GetSale(ctx, tenantID, saleID)
	if err != nil {
		return nil, err
	}
	if sale.Status != domain.SaleOpen {
		return nil, ErrSaleNotOpen
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, l := range lines {
			var product domain.Product
			if err := tx.First(&product, "id = ? AND tenant_id = ?", l.ProductID, tenantID).Error; err != nil {
				return fmt.Errorf("producto %s no encontrado", l.ProductID)
			}

			unitPrice := product.BasePrice
			qty := decimal.NewFromFloat(l.Quantity)
			lineTotal := unitPrice.Mul(qty)

			item := domain.SaleItem{
				TenantID:    tenantID,
				SaleID:      saleID,
				ProductID:   l.ProductID,
				ProductName: product.Name,
				Quantity:    qty,
				UnitPrice:   unitPrice,
				Discount:    decimal.Zero,
				TaxRate:     product.TaxRate,
				LineTotal:   lineTotal,
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}
		return s.recalcTotals(ctx, tx, saleID)
	})
	if err != nil {
		return nil, err
	}

	updated, _ := s.GetSale(ctx, tenantID, saleID)
	s.bus.Emit("sale.itemsAdded", map[string]any{
		"tenantId": tenantID,
		"saleId":   saleID,
		"addedBy":  "qr-customer",
		"sale":     updated,
	})
	return updated, nil
}

// RemoveItem elimina una línea y recalcula totales.
func (s *Service) RemoveItem(ctx context.Context, tenantID, saleID, itemID string) (*domain.Sale, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var item domain.SaleItem
		if err := tx.First(&item, "id = ? AND sale_id = ? AND tenant_id = ?", itemID, saleID, tenantID).Error; err != nil {
			return err
		}
		if err := tx.Delete(&item).Error; err != nil {
			return err
		}
		return s.recalcTotals(ctx, tx, saleID)
	})
	if err != nil {
		return nil, err
	}
	return s.GetSale(ctx, tenantID, saleID)
}

// CloseSale cobra la venta: verifica total, crea payments, descuenta stock,
// libera la mesa y emite evento sale.closed.
func (s *Service) CloseSale(ctx context.Context, tenantID, saleID, userID string, in CloseSaleInput) (*domain.Sale, error) {
	sale, err := s.GetSale(ctx, tenantID, saleID)
	if err != nil {
		return nil, err
	}
	switch sale.Status {
	case domain.SalePaid:
		return nil, ErrSalePaid
	case domain.SaleCancelled:
		return nil, ErrSaleCancelled
	}
	if len(sale.Items) == 0 {
		return nil, ErrEmptySale
	}

	// Validar cupón si aplica
	couponDiscount := decimal.Zero
	if in.CouponCode != "" {
		amount, _ := sale.Subtotal.Float64()
		v, err := s.promos.ValidateCoupon(ctx, tenantID, in.CouponCode, amount)
		if err != nil {
			return nil, err
		}
		if !v.Valid {
			return nil, errors.New(v.Message)
		}
		couponDiscount = v.Discount
	}

	subtotal := sale.Subtotal
	discountTotal := sale.DiscountTotal.Add(couponDiscount)
	tipAmount := decimal.NewFromFloat(in.TipAmount)

	// Total final
	taxBase := subtotal.Sub(couponDiscount)
	if taxBase.LessThan(decimal.Zero) {
		taxBase = decimal.Zero
	}
	taxTotal := computeTaxFromItems(sale.Items, couponDiscount, subtotal)
	grandTotal := taxBase.Add(tipAmount)

	// Validar referencias para métodos que requieren comprobante.
	for _, p := range in.Payments {
		if paymentRequiresReference(p.Method) && strings.TrimSpace(p.Reference) == "" {
			return nil, fmt.Errorf("la referencia es requerida para el método %s", p.Method)
		}
	}

	// Sumar lo pagado
	paid := decimal.Zero
	for _, p := range in.Payments {
		paid = paid.Add(decimal.NewFromFloat(p.Amount))
	}
	// Tolerancia de $1 por redondeo
	if paid.Sub(grandTotal).Abs().GreaterThan(decimal.NewFromInt(1)) {
		return nil, fmt.Errorf("%w: pagado=%s, esperado=%s", ErrPaymentMismatch, paid, grandTotal)
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Crear payments
		for _, p := range in.Payments {
			payment := domain.Payment{
				TenantID:  tenantID,
				SaleID:    saleID,
				Method:    p.Method,
				Amount:    decimal.NewFromFloat(p.Amount),
				Status:    domain.PaymentCompleted,
				Reference: p.Reference,
			}
			if err := tx.Create(&payment).Error; err != nil {
				return err
			}
		}

		// 2. Marcar venta como PAID
		now := time.Now()
		if err := tx.Model(&domain.Sale{}).
			Where("id = ?", saleID).
			Updates(map[string]any{
				"status":         domain.SalePaid,
				"discount_total": discountTotal,
				"tax_total":      taxTotal,
				"tip_amount":     tipAmount,
				"grand_total":    grandTotal,
				"closed_at":      &now,
			}).Error; err != nil {
			return err
		}

		// 3. Liberar mesa
		if sale.TableID != nil {
			if err := tx.Model(&domain.Table{}).
				Where("id = ?", *sale.TableID).
				Update("status", domain.TableFree).Error; err != nil {
				return err
			}
		}

		// 4. Descontar stock + registrar movimientos
		for _, item := range sale.Items {
			res := tx.Model(&domain.StockItem{}).
				Where("branch_id = ? AND product_id = ?", sale.BranchID, item.ProductID).
				Update("quantity", gorm.Expr("quantity - ?", item.Quantity))
			if res.Error != nil {
				return res.Error
			}
			mov := domain.InventoryMovement{
				TenantID:      tenantID,
				BranchID:      sale.BranchID,
				ProductID:     item.ProductID,
				MovementType:  domain.MovOutSale,
				Quantity:      item.Quantity,
				ReferenceType: "sale",
				ReferenceID:   saleID,
				CreatedBy:     userID,
			}
			if err := tx.Create(&mov).Error; err != nil {
				return err
			}
		}

		// 5. Consumir cupón
		if in.CouponCode != "" {
			if err := tx.Model(&domain.Coupon{}).
				Where("tenant_id = ? AND upper(code) = upper(?)", tenantID, in.CouponCode).
				Update("used_count", gorm.Expr("used_count + 1")).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	final, _ := s.GetSale(ctx, tenantID, saleID)
	totalF, _ := grandTotal.Float64()
	s.bus.Emit("sale.closed", map[string]any{
		"tenantId":   tenantID,
		"sale":       final,
		"amount":     totalF,
		"customerId": final.CustomerID,
		"userId":     userID,
	})
	return final, nil
}

// CancelSale anula una venta abierta y libera la mesa.
func (s *Service) CancelSale(ctx context.Context, tenantID, saleID, userID, reason string) (*domain.Sale, error) {
	sale, err := s.GetSale(ctx, tenantID, saleID)
	if err != nil {
		return nil, err
	}
	if sale.Status == domain.SalePaid {
		return nil, fmt.Errorf("no se puede cancelar una venta ya cobrada")
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		if err := tx.Model(&domain.Sale{}).
			Where("id = ?", saleID).
			Updates(map[string]any{
				"status":    domain.SaleCancelled,
				"closed_at": &now,
				"notes":     reason,
			}).Error; err != nil {
			return err
		}
		if sale.TableID != nil {
			if err := tx.Model(&domain.Table{}).
				Where("id = ?", *sale.TableID).
				Update("status", domain.TableFree).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	final, _ := s.GetSale(ctx, tenantID, saleID)
	s.bus.Emit("sale.cancelled", map[string]any{
		"tenantId": tenantID, "sale": final, "userId": userID, "reason": reason,
	})
	return final, nil
}

// ─── Helpers internos ─────────────────────────────────────────

func (s *Service) recalcTotals(ctx context.Context, tx *gorm.DB, saleID string) error {
	var items []domain.SaleItem
	if err := tx.Where("sale_id = ?", saleID).Find(&items).Error; err != nil {
		return err
	}
	subtotal := decimal.Zero
	discountTotal := decimal.Zero
	taxTotal := decimal.Zero
	for _, it := range items {
		subtotal = subtotal.Add(it.LineTotal)
		discountTotal = discountTotal.Add(it.Discount)
		// taxRate ya incluido en lineTotal (precios con IVA)
		taxFraction := it.TaxRate.Div(decimal.NewFromInt(1).Add(it.TaxRate))
		taxTotal = taxTotal.Add(it.LineTotal.Mul(taxFraction))
	}
	return tx.Model(&domain.Sale{}).Where("id = ?", saleID).Updates(map[string]any{
		"subtotal":       subtotal,
		"discount_total": discountTotal,
		"tax_total":      taxTotal,
		"grand_total":    subtotal,
	}).Error
}

func computeTaxFromItems(items []domain.SaleItem, couponDiscount, subtotal decimal.Decimal) decimal.Decimal {
	if subtotal.IsZero() {
		return decimal.Zero
	}
	ratio := subtotal.Sub(couponDiscount).Div(subtotal)
	if ratio.LessThan(decimal.Zero) {
		ratio = decimal.Zero
	}
	total := decimal.Zero
	for _, it := range items {
		taxFraction := it.TaxRate.Div(decimal.NewFromInt(1).Add(it.TaxRate))
		total = total.Add(it.LineTotal.Mul(ratio).Mul(taxFraction))
	}
	return total
}

func paymentRequiresReference(method domain.PaymentMethod) bool {
	switch method {
	case domain.PayTransfer, domain.PayNequi, domain.PayDaviplata, domain.PayPSE:
		return true
	default:
		return false
	}
}
