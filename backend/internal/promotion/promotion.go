// Package promotion — motor de descuentos (happy hour, cupones, niveles).
package promotion

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// LineInput representa un item a calcular.
type LineInput struct {
	ProductID string  `json:"productId" validate:"required,uuid"`
	Quantity  float64 `json:"quantity" validate:"required,gt=0"`
	Notes     string  `json:"notes,omitempty"`
}

// CalculatedLine es el resultado tras aplicar promos.
type CalculatedLine struct {
	ProductID    string          `json:"productId"`
	ProductName  string          `json:"productName"`
	Quantity     decimal.Decimal `json:"quantity"`
	UnitPrice    decimal.Decimal `json:"unitPrice"`
	Discount     decimal.Decimal `json:"discount"`
	TaxRate      decimal.Decimal `json:"taxRate"`
	LineTotal    decimal.Decimal `json:"lineTotal"`
	PromoApplied string          `json:"promoApplied,omitempty"`
	Notes        string          `json:"notes,omitempty"`
}

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

// ActiveRules devuelve las reglas vigentes a `now` (zona Bogotá).
func (s *Service) ActiveRules(ctx context.Context, tenantID string, now time.Time) ([]domain.PromotionRule, error) {
	bogota, _ := time.LoadLocation("America/Bogota")
	zoned := now.In(bogota)
	day := int(zoned.Weekday()) // 0=domingo
	hhmm := zoned.Format("15:04")

	var all []domain.PromotionRule
	if err := s.db.WithContext(ctx).
		Preload("Products").
		Where("tenant_id = ? AND active = true", tenantID).
		Find(&all).Error; err != nil {
		return nil, err
	}

	out := make([]domain.PromotionRule, 0, len(all))
	for _, r := range all {
		if r.StartsAt != nil && now.Before(*r.StartsAt) {
			continue
		}
		if r.EndsAt != nil && now.After(*r.EndsAt) {
			continue
		}
		if r.Type == domain.PromoHappyHour {
			if len(r.DaysOfWeek) > 0 && !containsInt(r.DaysOfWeek, day) {
				continue
			}
			if r.StartTime != "" && hhmm < r.StartTime {
				continue
			}
			if r.EndTime != "" && hhmm > r.EndTime {
				continue
			}
		}
		out = append(out, r)
	}
	return out, nil
}

// Calculate resuelve cada línea con la mejor promo aplicable.
func (s *Service) Calculate(
	ctx context.Context,
	tenantID string,
	lines []LineInput,
	customerID string,
) ([]CalculatedLine, error) {
	if len(lines) == 0 {
		return nil, nil
	}

	now := time.Now()
	rules, err := s.ActiveRules(ctx, tenantID, now)
	if err != nil {
		return nil, err
	}

	// Mapa productId → set de promos
	promoByProduct := make(map[string][]domain.PromotionRule)
	for _, r := range rules {
		for _, p := range r.Products {
			promoByProduct[p.ProductID] = append(promoByProduct[p.ProductID], r)
		}
	}

	ids := make([]string, 0, len(lines))
	for _, l := range lines {
		ids = append(ids, l.ProductID)
	}
	var products []domain.Product
	if err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND id IN ?", tenantID, ids).
		Find(&products).Error; err != nil {
		return nil, err
	}
	prodMap := make(map[string]domain.Product, len(products))
	for _, p := range products {
		prodMap[p.ID] = p
	}

	// Cargar customer si aplica
	var customer *domain.Customer
	if customerID != "" {
		var c domain.Customer
		if err := s.db.WithContext(ctx).First(&c, "id = ? AND tenant_id = ?", customerID, tenantID).Error; err == nil {
			customer = &c
		}
	}

	out := make([]CalculatedLine, 0, len(lines))
	for _, line := range lines {
		p, ok := prodMap[line.ProductID]
		if !ok {
			return nil, fmt.Errorf("producto %s no existe", line.ProductID)
		}

		qty := decimal.NewFromFloat(line.Quantity)
		unit := p.BasePrice
		bestDiscount := decimal.Zero
		var promoName string

		for _, r := range promoByProduct[p.ID] {
			if len(r.LoyaltyLevels) > 0 {
				if customer == nil || !containsStr(r.LoyaltyLevels, string(customer.LoyaltyLevel)) {
					continue
				}
			}
			var d decimal.Decimal
			if r.Type == domain.PromoFixedDiscount {
				d = r.DiscountValue
			} else {
				// porcentaje sobre el unitPrice
				d = r.DiscountValue.Div(decimal.NewFromInt(100)).Mul(unit)
			}
			if d.GreaterThan(bestDiscount) {
				bestDiscount = d
				promoName = r.Name
				if !r.Stackable {
					break
				}
			}
		}

		unitFinal := unit.Sub(bestDiscount)
		if unitFinal.LessThan(decimal.Zero) {
			unitFinal = decimal.Zero
		}
		lineTotal := unitFinal.Mul(qty)
		totalDiscount := bestDiscount.Mul(qty)

		out = append(out, CalculatedLine{
			ProductID:    p.ID,
			ProductName:  p.Name,
			Quantity:     qty,
			UnitPrice:    unit,
			Discount:     totalDiscount,
			TaxRate:      p.TaxRate,
			LineTotal:    lineTotal,
			PromoApplied: promoName,
			Notes:        line.Notes,
		})
	}
	return out, nil
}

// ValidateCoupon revisa si un cupón está activo y devuelve el descuento.
type CouponValidation struct {
	Valid    bool             `json:"valid"`
	Message  string           `json:"message,omitempty"`
	Discount decimal.Decimal  `json:"discount,omitempty"`
	CouponID string           `json:"couponId,omitempty"`
	Code     string           `json:"code,omitempty"`
}

func (s *Service) ValidateCoupon(ctx context.Context, tenantID, code string, orderAmount float64) (*CouponValidation, error) {
	var c domain.Coupon
	err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND upper(code) = upper(?)", tenantID, code).
		First(&c).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &CouponValidation{Valid: false, Message: "Cupón no encontrado"}, nil
		}
		return nil, err
	}
	if !c.Active {
		return &CouponValidation{Valid: false, Message: "Cupón inactivo"}, nil
	}
	if c.MaxUses != nil && c.UsedCount >= *c.MaxUses {
		return &CouponValidation{Valid: false, Message: "Cupón agotado"}, nil
	}
	now := time.Now()
	if c.StartsAt != nil && now.Before(*c.StartsAt) {
		return &CouponValidation{Valid: false, Message: "Cupón aún no vigente"}, nil
	}
	if c.ExpiresAt != nil && now.After(*c.ExpiresAt) {
		return &CouponValidation{Valid: false, Message: "Cupón vencido"}, nil
	}

	var discount decimal.Decimal
	if c.DiscountType == "percentage" {
		discount = c.Value.Div(decimal.NewFromInt(100)).Mul(decimal.NewFromFloat(orderAmount))
	} else {
		discount = c.Value
	}

	return &CouponValidation{
		Valid: true, Discount: discount, CouponID: c.ID, Code: c.Code,
	}, nil
}

// ConsumeCoupon incrementa el contador. Se llama tras cobrar la venta.
func (s *Service) ConsumeCoupon(ctx context.Context, tenantID, code string) error {
	return s.db.WithContext(ctx).
		Model(&domain.Coupon{}).
		Where("tenant_id = ? AND upper(code) = upper(?)", tenantID, code).
		Update("used_count", gorm.Expr("used_count + 1")).Error
}

// ─── HTTP ─────────────────────────────────────────────────────

type Handlers struct{ svc *Service }

func NewHandlers(svc *Service) *Handlers { return &Handlers{svc: svc} }

func (h *Handlers) Register(r fiber.Router) {
	r.Get("/active", h.active)
	r.Post("/calculate", h.calculate)
	r.Get("/coupons/validate", h.validateCoupon)
}

func (h *Handlers) active(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "")
	}
	rules, err := h.svc.ActiveRules(c.Context(), u.TenantID, time.Now())
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(rules)
}

type calcReq struct {
	Lines      []LineInput `json:"lines" validate:"required,dive"`
	CustomerID string      `json:"customerId,omitempty"`
}

func (h *Handlers) calculate(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "")
	}
	var dto calcReq
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	res, err := h.svc.Calculate(c.Context(), u.TenantID, dto.Lines, dto.CustomerID)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(res)
}

func (h *Handlers) validateCoupon(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "")
	}
	code := c.Query("code")
	if code == "" {
		return httpx.BadRequest(c, "código requerido")
	}
	amount := c.QueryFloat("amount", 0)
	v, err := h.svc.ValidateCoupon(c.Context(), u.TenantID, code, amount)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(v)
}

func containsInt(arr domain.IntArray, v int) bool {
	for _, x := range arr {
		if x == v {
			return true
		}
	}
	return false
}

func containsStr(arr domain.StringArray, v string) bool {
	for _, x := range arr {
		if x == v {
			return true
		}
	}
	return false
}
