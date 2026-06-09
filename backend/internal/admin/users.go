package admin

import (
	"context"
	"errors"

	"github.com/admiral/admiral-pro/internal/auth"
	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type UserService struct{ db *gorm.DB }

func NewUserService(db *gorm.DB) *UserService { return &UserService{db: db} }

type UserInput struct {
	Email    string          `json:"email" validate:"required,email"`
	Name     string          `json:"name" validate:"required,min=2"`
	Phone    string          `json:"phone,omitempty"`
	Role     domain.UserRole `json:"role" validate:"required,oneof=ADMIN MANAGER BARISTA WAITER CASHIER"`
	Password string          `json:"password" validate:"required,min=8"`
	PIN      string          `json:"pin" validate:"required,len=4"`
}

type UserUpdateInput struct {
	Name     string          `json:"name,omitempty"`
	Phone    string          `json:"phone,omitempty"`
	Role     domain.UserRole `json:"role,omitempty"`
	Active   *bool           `json:"active,omitempty"`
	Password string          `json:"password,omitempty"`
	PIN      string          `json:"pin,omitempty"`
}

func (s *UserService) List(ctx context.Context, tenantID string, pg httpx.Pagination) (*httpx.PaginatedResult[domain.User], error) {
	var total int64
	if err := s.db.WithContext(ctx).Model(&domain.User{}).Where("tenant_id = ?", tenantID).Count(&total).Error; err != nil {
		return nil, err
	}
	var users []domain.User
	err := s.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Order("name asc").
		Offset(pg.Offset()).
		Limit(pg.PageSize).
		Find(&users).Error
	if err != nil {
		return nil, err
	}
	result := httpx.NewPaginatedResult(users, int(total), pg)
	return &result, nil
}

func (s *UserService) Create(ctx context.Context, tenantID string, in UserInput) (*domain.User, error) {
	pwdHash, err := auth.HashPassword(in.Password)
	if err != nil {
		return nil, err
	}
	pinHash, err := auth.HashPassword(in.PIN)
	if err != nil {
		return nil, err
	}
	u := domain.User{
		TenantID:     tenantID,
		Email:        in.Email,
		Name:         in.Name,
		Phone:        in.Phone,
		Role:         in.Role,
		PasswordHash: pwdHash,
		PINHash:      pinHash,
		Active:       true,
	}
	err = s.db.WithContext(ctx).Create(&u).Error
	return &u, err
}

func (s *UserService) Update(ctx context.Context, tenantID, id string, in UserUpdateInput) (*domain.User, error) {
	updates := map[string]any{}
	if in.Name != "" {
		updates["name"] = in.Name
	}
	if in.Phone != "" {
		updates["phone"] = in.Phone
	}
	if in.Role != "" {
		updates["role"] = in.Role
	}
	if in.Active != nil {
		updates["active"] = *in.Active
	}
	if in.Password != "" {
		h, err := auth.HashPassword(in.Password)
		if err != nil {
			return nil, err
		}
		updates["password_hash"] = h
	}
	if in.PIN != "" {
		if len(in.PIN) != 4 {
			return nil, errors.New("PIN debe ser 4 dígitos")
		}
		h, err := auth.HashPassword(in.PIN)
		if err != nil {
			return nil, err
		}
		updates["pin_hash"] = h
		updates["failed_attempts"] = 0
		updates["locked_until"] = nil
	}
	if err := s.db.WithContext(ctx).Model(&domain.User{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).Updates(updates).Error; err != nil {
		return nil, err
	}
	var u domain.User
	_ = s.db.WithContext(ctx).First(&u, "id = ?", id).Error
	return &u, nil
}

func (s *UserService) ResetPIN(ctx context.Context, tenantID, id, newPIN string) error {
	h, err := auth.HashPassword(newPIN)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Model(&domain.User{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Updates(map[string]any{"pin_hash": h, "failed_attempts": 0, "locked_until": nil}).Error
}

func (s *UserService) Deactivate(ctx context.Context, tenantID, id string) error {
	return s.db.WithContext(ctx).Model(&domain.User{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Update("active", false).Error
}

// ─── HTTP ─────────────────────────────────────────────────────

type UserHandlers struct{ svc *UserService }

func NewUserHandlers(svc *UserService) *UserHandlers { return &UserHandlers{svc: svc} }

func (h *UserHandlers) Register(r fiber.Router) {
	r.Get("/", middleware.RequireRoles("ADMIN", "MANAGER"), h.list)
	r.Post("/", middleware.RequireRoles("ADMIN"), h.create)
	r.Put("/:id", middleware.RequireRoles("ADMIN"), h.update)
	r.Put("/:id/reset-pin", middleware.RequireRoles("ADMIN", "MANAGER"), h.resetPIN)
	r.Delete("/:id", middleware.RequireRoles("ADMIN"), h.deactivate)
}

func (h *UserHandlers) list(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	pg := httpx.ParsePagination(c)
	out, err := h.svc.List(c.Context(), u.TenantID, pg)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *UserHandlers) create(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto UserInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	out, err := h.svc.Create(c.Context(), u.TenantID, dto)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(out)
}

func (h *UserHandlers) update(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto UserUpdateInput
	if err := c.BodyParser(&dto); err != nil {
		return httpx.BadRequest(c, "JSON inválido")
	}
	out, err := h.svc.Update(c.Context(), u.TenantID, c.Params("id"), dto)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *UserHandlers) resetPIN(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto struct {
		PIN string `json:"pin" validate:"required,len=4"`
	}
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	if err := h.svc.ResetPIN(c.Context(), u.TenantID, c.Params("id"), dto.PIN); err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *UserHandlers) deactivate(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if err := h.svc.Deactivate(c.Context(), u.TenantID, c.Params("id")); err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(fiber.Map{"ok": true})
}
