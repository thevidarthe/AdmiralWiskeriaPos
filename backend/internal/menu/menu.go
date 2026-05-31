// Package menu expone el catálogo público (categorías + productos).
package menu

import (
	"context"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

func (s *Service) Categories(ctx context.Context, tenantID string) ([]domain.Category, error) {
	var cats []domain.Category
	err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND active = true", tenantID).
		Order("sort_order asc, name asc").
		Find(&cats).Error
	return cats, err
}

// ProductView incluye stock si se pasó branchId.
type ProductView struct {
	domain.Product
	StockQuantity float64 `json:"stockQuantity,omitempty"`
}

func (s *Service) Products(ctx context.Context, tenantID, categorySlug, branchID string) ([]ProductView, error) {
	q := s.db.WithContext(ctx).
		Preload("Category").
		Where("tenant_id = ? AND available = true", tenantID).
		Order("sort_order asc, name asc")

	if categorySlug != "" {
		q = q.Joins("JOIN categories c ON c.id = products.category_id").
			Where("c.slug = ?", categorySlug)
	}

	var products []domain.Product
	if err := q.Find(&products).Error; err != nil {
		return nil, err
	}

	out := make([]ProductView, len(products))
	for i, p := range products {
		out[i] = ProductView{Product: p}
	}

	if branchID != "" && len(products) > 0 {
		ids := make([]string, len(products))
		for i, p := range products {
			ids[i] = p.ID
		}
		var stocks []domain.StockItem
		_ = s.db.WithContext(ctx).
			Where("branch_id = ? AND product_id IN ?", branchID, ids).
			Find(&stocks).Error
		stockMap := make(map[string]float64, len(stocks))
		for _, st := range stocks {
			f, _ := st.Quantity.Float64()
			stockMap[st.ProductID] = f
		}
		for i := range out {
			out[i].StockQuantity = stockMap[out[i].ID]
		}
	}

	return out, nil
}

// ─── HTTP ─────────────────────────────────────────────────────

type Handlers struct{ svc *Service }

func NewHandlers(svc *Service) *Handlers { return &Handlers{svc: svc} }

func (h *Handlers) Register(r fiber.Router) {
	r.Get("/categories", h.listCategories)
	r.Get("/products", h.listProducts)
}

func (h *Handlers) listCategories(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "")
	}
	cats, err := h.svc.Categories(c.Context(), u.TenantID)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(cats)
}

func (h *Handlers) listProducts(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "")
	}
	products, err := h.svc.Products(c.Context(), u.TenantID, c.Query("category"), c.Query("branchId"))
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(products)
}
