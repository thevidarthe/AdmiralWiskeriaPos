package crm

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/admiral/admiral-pro/internal/event"
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

var loyaltyThresholds = map[domain.LoyaltyLevel]decimal.Decimal{
	domain.LoyaltyPlatinum: decimal.NewFromInt(5_000_000),
	domain.LoyaltyGold:     decimal.NewFromInt(2_000_000),
	domain.LoyaltySilver:   decimal.NewFromInt(500_000),
}

type Service struct {
	db  *gorm.DB
	bus *event.Bus
}

func NewService(db *gorm.DB, bus *event.Bus) *Service {
	s := &Service{db: db, bus: bus}
	bus.On("sale.closed", s.onSaleClosed)
	return s
}

type UpsertCustomerInput struct {
	Phone    string     `json:"phone" validate:"required,min=7"`
	Name     string     `json:"name,omitempty"`
	Email    string     `json:"email,omitempty" validate:"omitempty,email"`
	Birthday *time.Time `json:"birthday,omitempty"`
}

type PublicRegisterInput struct {
	TenantSlug string `json:"tenantSlug" validate:"required"`
	Phone      string `json:"phone" validate:"required,min=7"`
	Name       string `json:"name,omitempty"`
	Email      string `json:"email,omitempty" validate:"omitempty,email"`
}

type SegmentInput struct {
	LoyaltyLevels       []domain.LoyaltyLevel `json:"loyaltyLevels,omitempty"`
	MinVisits           int                   `json:"minVisits,omitempty"`
	MinTotalSpent       float64               `json:"minTotalSpent,omitempty"`
}

func (s *Service) UpsertCustomer(ctx context.Context, tenantID string, in UpsertCustomerInput) (*domain.Customer, error) {
	phone := normalizePhone(in.Phone)
	if phone == "" {
		return nil, errors.New("tel\xc3\xa9fono inv\xc3\xa1lido")
	}

	var c domain.Customer
	err := s.db.WithContext(ctx).Where("tenant_id = ? AND phone = ?", tenantID, phone).First(&c).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c = domain.Customer{
			TenantID: tenantID,
			Phone:    phone,
			Name:     defaultStr(in.Name, "Cliente"),
			Email:    in.Email,
			Birthday: in.Birthday,
		}
		if err := s.db.WithContext(ctx).Create(&c).Error; err != nil {
			return nil, err
		}
	} else {
		updates := map[string]any{}
		if in.Name != "" {
			updates["name"] = in.Name
		}
		if in.Email != "" {
			updates["email"] = in.Email
		}
		if in.Birthday != nil {
			updates["birthday"] = in.Birthday
		}
		if len(updates) > 0 {
			if err := s.db.WithContext(ctx).Model(&c).Updates(updates).Error; err != nil {
				return nil, err
			}
		}
	}
	return &c, nil
}

func (s *Service) GetCustomer(ctx context.Context, tenantID string, id string) (*domain.Customer, error) {
	var c domain.Customer
	err := s.db.WithContext(ctx).
		Preload("Consents", "active = true").
		First(&c, "id = ? AND tenant_id = ?", id, tenantID).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

type ListOpts struct {
	Search  string
	Level   domain.LoyaltyLevel
	Page    int
	PerPage int
}

type PaginatedCustomers struct {
	Items   []domain.Customer `json:"items"`
	Total   int64             `json:"total"`
	Page    int               `json:"page"`
	PerPage int               `json:"perPage"`
	Pages   int               `json:"pages"`
}

func (s *Service) ListCustomers(ctx context.Context, tenantID string, opts ListOpts) (*PaginatedCustomers, error) {
	if opts.Page < 1 {
		opts.Page = 1
	}
	if opts.PerPage < 1 || opts.PerPage > 200 {
		opts.PerPage = 50
	}

	q := s.db.WithContext(ctx).Model(&domain.Customer{}).Where("tenant_id = ?", tenantID)
	if opts.Search != "" {
		like := "%" + strings.ToLower(opts.Search) + "%"
		q = q.Where("lower(name) LIKE ? OR phone LIKE ? OR lower(email) LIKE ?", like, "%"+opts.Search+"%", like)
	}
	if opts.Level != "" {
		q = q.Where("loyalty_level = ?", opts.Level)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, err
	}

	var items []domain.Customer
	if err := q.Order("total_spent desc").
		Offset((opts.Page - 1) * opts.PerPage).
		Limit(opts.PerPage).
		Preload("Consents", "active = true").
		Find(&items).Error; err != nil {
		return nil, err
	}

	pages := int(total / int64(opts.PerPage))
	if total%int64(opts.PerPage) > 0 {
		pages++
	}
	return &PaginatedCustomers{Items: items, Total: total, Page: opts.Page, PerPage: opts.PerPage, Pages: pages}, nil
}

func (s *Service) SegmentMembers(ctx context.Context, tenantID string, in SegmentInput) ([]domain.Customer, error) {
	q := s.db.WithContext(ctx).Where("tenant_id = ?", tenantID)
	if len(in.LoyaltyLevels) > 0 {
		q = q.Where("loyalty_level IN ?", in.LoyaltyLevels)
	}
	if in.MinVisits > 0 {
		q = q.Where("visit_count >= ?", in.MinVisits)
	}
	if in.MinTotalSpent > 0 {
		q = q.Where("total_spent >= ?", in.MinTotalSpent)
	}
	var out []domain.Customer
	err := q.Find(&out).Error
	return out, err
}

func (s *Service) onSaleClosed(payload any) {
	data, ok := payload.(map[string]any)
	if !ok {
		return
	}
	sale, _ := data["sale"].(*domain.Sale)
	if sale == nil || sale.CustomerID == nil || *sale.CustomerID == "" {
		return
	}
	amount, _ := data["amount"].(float64)
	points := int(amount * 0.01)
	if points <= 0 {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_ = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var c domain.Customer
		if err := tx.First(&c, "id = ?", *sale.CustomerID).Error; err != nil {
			return err
		}
		newTotalSpent := c.TotalSpent.Add(decimal.NewFromFloat(amount))
		newLevel := evalLevel(newTotalSpent)
		now := time.Now()
		if err := tx.Model(&c).Updates(map[string]any{
			"points_balance":  gorm.Expr("points_balance + ?", points),
			"total_spent":     newTotalSpent,
			"visit_count":     gorm.Expr("visit_count + 1"),
			"last_visit_at":   &now,
			"loyalty_level":   newLevel,
		}).Error; err != nil {
			return err
		}
		ltx := domain.LoyaltyTransaction{
			CustomerID:  c.ID,
			SaleID:      &sale.ID,
			PointsDelta: points,
			Reason:      "Compra en Admiral",
		}
		return tx.Create(&ltx).Error
	})
}

func evalLevel(totalSpent decimal.Decimal) domain.LoyaltyLevel {
	if totalSpent.GreaterThanOrEqual(loyaltyThresholds[domain.LoyaltyPlatinum]) {
		return domain.LoyaltyPlatinum
	}
	if totalSpent.GreaterThanOrEqual(loyaltyThresholds[domain.LoyaltyGold]) {
		return domain.LoyaltyGold
	}
	if totalSpent.GreaterThanOrEqual(loyaltyThresholds[domain.LoyaltySilver]) {
		return domain.LoyaltySilver
	}
	return domain.LoyaltyClassic
}

var phoneRe = regexp.MustCompile(`\D`)

func normalizePhone(p string) string {
	digits := phoneRe.ReplaceAllString(p, "")
	if digits == "" {
		return ""
	}
	if strings.HasPrefix(digits, "57") && len(digits) == 12 {
		return "+" + digits
	}
	if len(digits) == 10 {
		return "+57" + digits
	}
	if strings.HasPrefix(p, "+") {
		return p
	}
	return "+" + digits
}

func defaultStr(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}

type Handlers struct{ svc *Service }

func NewHandlers(svc *Service) *Handlers { return &Handlers{svc: svc} }

func (h *Handlers) Register(r fiber.Router) {
	r.Get("/customers", h.list)
	r.Get("/customers/:id", h.get)
	r.Post("/customers", h.upsert)
	r.Post("/segments/preview", h.segment)
}

func (h *Handlers) RegisterPublic(r fiber.Router) {
	r.Post("/register", h.RegisterPublicCustomer)
}

func (h *Handlers) list(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	out, err := h.svc.ListCustomers(c.Context(), u.TenantID, ListOpts{
		Search:  c.Query("search"),
		Level:   domain.LoyaltyLevel(c.Query("level")),
		Page:    c.QueryInt("page", 1),
		PerPage: c.QueryInt("perPage", 50),
	})
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) get(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	out, err := h.svc.GetCustomer(c.Context(), u.TenantID, c.Params("id"))
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) upsert(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto UpsertCustomerInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	out, err := h.svc.UpsertCustomer(c.Context(), u.TenantID, dto)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) segment(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto SegmentInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	out, err := h.svc.SegmentMembers(c.Context(), u.TenantID, dto)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) RegisterPublicCustomer(c *fiber.Ctx) error {
	var dto PublicRegisterInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}

	var t domain.Tenant
	if err := h.svc.db.WithContext(c.Context()).First(&t, "slug = ? AND active = true", dto.TenantSlug).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return httpx.BadRequest(c, "Tenant inv\xc3\xa1lido o inactivo")
		}
		return httpx.FromError(c, err)
	}

	out, err := h.svc.UpsertCustomer(c.Context(), t.ID, UpsertCustomerInput{
		Phone: dto.Phone,
		Name:  dto.Name,
		Email: dto.Email,
	})
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}
