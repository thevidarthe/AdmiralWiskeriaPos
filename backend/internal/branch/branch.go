// Package branch — listado de sucursales del tenant del usuario autenticado.
//
// El frontend necesita conocer las sucursales reales (UUIDs) tras el login;
// sin esto, hardcodear IDs ficticios como "branch-main" rompe Postgres.
package branch

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

// List devuelve las sucursales activas del tenant.
func (s *Service) List(ctx context.Context, tenantID string) ([]domain.Branch, error) {
	var out []domain.Branch
	err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND active = true", tenantID).
		Order("created_at asc").
		Find(&out).Error
	return out, err
}

// Current devuelve la primera sucursal activa del tenant (atajo útil para apps
// con una sola sucursal).
func (s *Service) Current(ctx context.Context, tenantID string) (*domain.Branch, error) {
	var b domain.Branch
	if err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND active = true", tenantID).
		Order("created_at asc").
		First(&b).Error; err != nil {
		return nil, err
	}
	return &b, nil
}

// ─── HTTP ─────────────────────────────────────────────────────

type Handlers struct{ svc *Service }

func NewHandlers(svc *Service) *Handlers { return &Handlers{svc: svc} }

func (h *Handlers) Register(r fiber.Router) {
	r.Get("/", h.list)
	r.Get("/current", h.current)
}

func (h *Handlers) list(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	out, err := h.svc.List(c.Context(), u.TenantID)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) current(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	b, err := h.svc.Current(c.Context(), u.TenantID)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(b)
}
