package admin

import (
	"context"
	"errors"
	"strings"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type ProductService struct{ db *gorm.DB }

func NewProductService(db *gorm.DB) *ProductService { return &ProductService{db: db} }

type ProductInput struct {
	CategoryID     string             `json:"categoryId" validate:"required,uuid"`
	Name           string             `json:"name" validate:"required,min=2"`
	Description    string             `json:"description,omitempty"`
	SKU            string             `json:"sku,omitempty"`
	Barcode        string             `json:"barcode,omitempty"`
	BasePrice      float64            `json:"basePrice" validate:"required,gt=0"`
	CostPrice      float64            `json:"costPrice,omitempty"`
	TaxRate        float64            `json:"taxRate,omitempty"`
	Unit           domain.ProductUnit `json:"unit,omitempty"`
	ImageURL       string             `json:"imageUrl,omitempty"`
	IsCombo        bool               `json:"isCombo,omitempty"`
	TrackInventory bool               `json:"trackInventory"`
	MinStock       float64            `json:"minStock,omitempty"`
	Available      bool               `json:"available"`
	SortOrder      int                `json:"sortOrder,omitempty"`
}

type ListOpts struct {
	CategoryID string
	Available  *bool
	Search     string
	Page       int
	PerPage    int
}

type ProductsPage struct {
	Items   []domain.Product `json:"items"`
	Total   int64            `json:"total"`
	Page    int              `json:"page"`
	PerPage int              `json:"perPage"`
	Pages   int              `json:"pages"`
}

func (s *ProductService) List(ctx context.Context, tenantID string, opts ListOpts) (*ProductsPage, error) {
	if opts.Page < 1 {
		opts.Page = 1
	}
	if opts.PerPage < 1 || opts.PerPage > 200 {
		opts.PerPage = 50
	}

	q := s.db.WithContext(ctx).Model(&domain.Product{}).Where("tenant_id = ?", tenantID)
	if opts.CategoryID != "" {
		q = q.Where("category_id = ?", opts.CategoryID)
	}
	if opts.Available != nil {
		q = q.Where("available = ?", *opts.Available)
	}
	if opts.Search != "" {
		like := "%" + strings.ToLower(opts.Search) + "%"
		q = q.Where("lower(name) LIKE ? OR lower(sku) LIKE ? OR barcode = ?", like, like, opts.Search)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, err
	}

	var items []domain.Product
	if err := q.Preload("Category").
		Order("sort_order asc, name asc").
		Offset((opts.Page - 1) * opts.PerPage).
		Limit(opts.PerPage).
		Find(&items).Error; err != nil {
		return nil, err
	}

	pages := int(total / int64(opts.PerPage))
	if total%int64(opts.PerPage) > 0 {
		pages++
	}
	return &ProductsPage{Items: items, Total: total, Page: opts.Page, PerPage: opts.PerPage, Pages: pages}, nil
}

func (s *ProductService) Get(ctx context.Context, tenantID, id string) (*domain.Product, error) {
	var p domain.Product
	err := s.db.WithContext(ctx).Preload("Category").
		First(&p, "id = ? AND tenant_id = ?", id, tenantID).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *ProductService) Create(ctx context.Context, tenantID string, in ProductInput) (*domain.Product, error) {
	var cat domain.Category
	if err := s.db.WithContext(ctx).First(&cat, "id = ? AND tenant_id = ?", in.CategoryID, tenantID).Error; err != nil {
		return nil, errors.New("categoría inválida")
	}
	p := domain.Product{
		TenantID:       tenantID,
		CategoryID:     in.CategoryID,
		Name:           in.Name,
		Description:    in.Description,
		SKU:            in.SKU,
		Barcode:        in.Barcode,
		BasePrice:      decimal.NewFromFloat(in.BasePrice),
		Unit:           defaultUnit(in.Unit),
		ImageURL:       in.ImageURL,
		IsCombo:        in.IsCombo,
		TrackInventory: in.TrackInventory,
		Available:      in.Available,
		SortOrder:      in.SortOrder,
	}
	if in.CostPrice > 0 {
		cp := decimal.NewFromFloat(in.CostPrice)
		p.CostPrice = &cp
	}
	if in.TaxRate > 0 {
		p.TaxRate = decimal.NewFromFloat(in.TaxRate)
	} else {
		p.TaxRate = decimal.NewFromFloat(0.19)
	}
	if in.MinStock > 0 {
		ms := decimal.NewFromFloat(in.MinStock)
		p.MinStock = &ms
	}
	err := s.db.WithContext(ctx).Create(&p).Error
	return &p, err
}

func (s *ProductService) Update(ctx context.Context, tenantID, id string, in ProductInput) (*domain.Product, error) {
	updates := map[string]any{
		"name":            in.Name,
		"description":     in.Description,
		"base_price":      decimal.NewFromFloat(in.BasePrice),
		"unit":            defaultUnit(in.Unit),
		"image_url":       in.ImageURL,
		"is_combo":        in.IsCombo,
		"track_inventory": in.TrackInventory,
		"available":       in.Available,
		"sort_order":      in.SortOrder,
		"sku":             in.SKU,
		"barcode":         in.Barcode,
		"category_id":     in.CategoryID,
	}
	if in.CostPrice > 0 {
		updates["cost_price"] = decimal.NewFromFloat(in.CostPrice)
	}
	if in.TaxRate > 0 {
		updates["tax_rate"] = decimal.NewFromFloat(in.TaxRate)
	}
	if in.MinStock > 0 {
		updates["min_stock"] = decimal.NewFromFloat(in.MinStock)
	}

	res := s.db.WithContext(ctx).Model(&domain.Product{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	return s.Get(ctx, tenantID, id)
}

func (s *ProductService) ToggleAvailable(ctx context.Context, tenantID, id string) (*domain.Product, error) {
	if err := s.db.WithContext(ctx).Exec(
		`UPDATE products SET available = NOT available WHERE id = ? AND tenant_id = ?`, id, tenantID,
	).Error; err != nil {
		return nil, err
	}
	return s.Get(ctx, tenantID, id)
}

func (s *ProductService) Delete(ctx context.Context, tenantID, id string) error {
	var used int64
	s.db.WithContext(ctx).Model(&domain.SaleItem{}).
		Where("tenant_id = ? AND product_id = ?", tenantID, id).Count(&used)
	if used > 0 {
		// Soft delete: marca como no disponible
		return s.db.WithContext(ctx).Model(&domain.Product{}).
			Where("id = ? AND tenant_id = ?", id, tenantID).
			Update("available", false).Error
	}
	return s.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Delete(&domain.Product{}).Error
}

func defaultUnit(u domain.ProductUnit) domain.ProductUnit {
	if u == "" {
		return domain.UnitUnit
	}
	return u
}

// ─── HTTP ─────────────────────────────────────────────────────

type ProductHandlers struct{ svc *ProductService }

func NewProductHandlers(svc *ProductService) *ProductHandlers {
	return &ProductHandlers{svc: svc}
}

func (h *ProductHandlers) Register(r fiber.Router) {
	r.Get("/", h.list)
	r.Get("/:id", h.get)
	r.Post("/", h.create)
	r.Put("/:id", h.update)
	r.Put("/:id/toggle", h.toggle)
	r.Delete("/:id", h.delete)
}

func (h *ProductHandlers) list(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	opts := ListOpts{
		CategoryID: c.Query("categoryId"),
		Search:     c.Query("search"),
		Page:       c.QueryInt("page", 1),
		PerPage:    c.QueryInt("perPage", 50),
	}
	if v := c.Query("available"); v != "" {
		b := v == "true"
		opts.Available = &b
	}
	out, err := h.svc.List(c.Context(), u.TenantID, opts)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *ProductHandlers) get(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	out, err := h.svc.Get(c.Context(), u.TenantID, c.Params("id"))
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *ProductHandlers) create(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto ProductInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	out, err := h.svc.Create(c.Context(), u.TenantID, dto)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(out)
}

func (h *ProductHandlers) update(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto ProductInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	out, err := h.svc.Update(c.Context(), u.TenantID, c.Params("id"), dto)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *ProductHandlers) toggle(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	out, err := h.svc.ToggleAvailable(c.Context(), u.TenantID, c.Params("id"))
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *ProductHandlers) delete(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if err := h.svc.Delete(c.Context(), u.TenantID, c.Params("id")); err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(fiber.Map{"ok": true})
}
