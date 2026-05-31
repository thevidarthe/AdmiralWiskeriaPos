package admin

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type CategoryService struct{ db *gorm.DB }

func NewCategoryService(db *gorm.DB) *CategoryService { return &CategoryService{db: db} }

type CategoryInput struct {
	Name      string `json:"name" validate:"required,min=2"`
	Slug      string `json:"slug,omitempty"`
	Icon      string `json:"icon,omitempty"`
	Color     string `json:"color,omitempty"`
	ParentID  string `json:"parentId,omitempty"`
	SortOrder int    `json:"sortOrder,omitempty"`
}

func (s *CategoryService) List(ctx context.Context, tenantID string) ([]domain.Category, error) {
	var out []domain.Category
	err := s.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("sort_order asc, name asc").Find(&out).Error
	return out, err
}

func (s *CategoryService) Create(ctx context.Context, tenantID string, in CategoryInput) (*domain.Category, error) {
	slug := strings.ToLower(strings.TrimSpace(in.Slug))
	if slug == "" {
		slug = slugify(in.Name)
	}
	c := domain.Category{
		TenantID:  tenantID,
		Name:      in.Name,
		Slug:      slug,
		Icon:      in.Icon,
		Color:     in.Color,
		SortOrder: in.SortOrder,
	}
	if in.ParentID != "" {
		c.ParentID = &in.ParentID
	}
	err := s.db.WithContext(ctx).Create(&c).Error
	return &c, err
}

func (s *CategoryService) Update(ctx context.Context, tenantID, id string, in CategoryInput) (*domain.Category, error) {
	updates := map[string]any{}
	if in.Name != "" {
		updates["name"] = in.Name
	}
	if in.Icon != "" {
		updates["icon"] = in.Icon
	}
	if in.Color != "" {
		updates["color"] = in.Color
	}
	if in.SortOrder != 0 {
		updates["sort_order"] = in.SortOrder
	}
	res := s.db.WithContext(ctx).
		Model(&domain.Category{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	var c domain.Category
	_ = s.db.WithContext(ctx).First(&c, "id = ? AND tenant_id = ?", id, tenantID).Error
	return &c, nil
}

func (s *CategoryService) Delete(ctx context.Context, tenantID, id string) error {
	var count int64
	s.db.WithContext(ctx).Model(&domain.Product{}).
		Where("tenant_id = ? AND category_id = ?", tenantID, id).
		Count(&count)
	if count > 0 {
		return errors.New("la categoría tiene productos asociados")
	}
	return s.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Delete(&domain.Category{}).Error
}

// ─── HTTP ─────────────────────────────────────────────────────

type CategoryHandlers struct{ svc *CategoryService }

func NewCategoryHandlers(svc *CategoryService) *CategoryHandlers {
	return &CategoryHandlers{svc: svc}
}

func (h *CategoryHandlers) Register(r fiber.Router) {
	r.Get("/", h.list)
	r.Post("/", h.create)
	r.Put("/:id", h.update)
	r.Delete("/:id", h.delete)
}

func (h *CategoryHandlers) list(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	out, err := h.svc.List(c.Context(), u.TenantID)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}
func (h *CategoryHandlers) create(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto CategoryInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	out, err := h.svc.Create(c.Context(), u.TenantID, dto)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(out)
}
func (h *CategoryHandlers) update(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto CategoryInput
	_ = c.BodyParser(&dto)
	out, err := h.svc.Update(c.Context(), u.TenantID, c.Params("id"), dto)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}
func (h *CategoryHandlers) delete(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if err := h.svc.Delete(c.Context(), u.TenantID, c.Params("id")); err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.JSON(fiber.Map{"ok": true})
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = slugRe.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}
