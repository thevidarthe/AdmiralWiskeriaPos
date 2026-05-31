package brand

import (
	"errors"

	"github.com/admiral/admiral-pro/internal/auth"
	"github.com/admiral/admiral-pro/internal/menu"
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/internal/qr"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
)

type Handlers struct {
	auth *auth.Service
	menu *menu.Service
	qr   *qr.Service
}

func NewHandlers(authSvc *auth.Service, menuSvc *menu.Service, qrSvc *qr.Service) *Handlers {
	return &Handlers{auth: authSvc, menu: menuSvc, qr: qrSvc}
}

func (h *Handlers) RegisterPublic(r fiber.Router) {
	authGroup := r.Group("/auth")
	authGroup.Post("/signin", h.signIn)
	authGroup.Post("/pin", h.signInWithPIN)
	authGroup.Get("/staff/:tenantSlug", h.listStaff)

	qrGroup := r.Group("/qr")
	qrGroup.Get("/resolve/:token", h.resolve)
	qrGroup.Get("/menu/:token", h.publicMenu)
	qrGroup.Post("/waiter/:token/call", h.callWaiter)
}

func (h *Handlers) RegisterPrivate(r fiber.Router) {
	route := r.Group("")
	route.Get("/profile", h.me)
	route.Put("/profile/password", h.changePassword)
	route.Put("/profile/pin", h.changePIN)

	menuGroup := r.Group("/menu")
	menuGroup.Get("/categories", h.categories)
	menuGroup.Get("/products", h.products)

	qrGroup := r.Group("/qr")
	qrGroup.Post("/codes", h.generate)
	qrGroup.Get("/codes", h.listCodes)
}

type signInReq struct {
	TenantSlug string `json:"tenantSlug" validate:"required"`
	Email      string `json:"email" validate:"required,email"`
	Password   string `json:"password" validate:"required,min=6"`
}

type signInPINReq struct {
	TenantSlug string `json:"tenantSlug" validate:"required"`
	UserID     string `json:"userId" validate:"required,uuid"`
	PIN        string `json:"pin" validate:"required,len=4"`
}

type generateQRReq struct {
	BranchID string `json:"branchId" validate:"required,uuid"`
	TableID  string `json:"tableId" validate:"required,uuid"`
}

func (h *Handlers) signIn(c *fiber.Ctx) error {
	var dto signInReq
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	res, err := h.auth.LoginWithPassword(c.Context(), dto.TenantSlug, dto.Email, dto.Password)
	if err != nil {
		return mapAuthError(c, err)
	}
	return c.JSON(res)
}

func (h *Handlers) signInWithPIN(c *fiber.Ctx) error {
	var dto signInPINReq
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	res, err := h.auth.LoginWithPIN(c.Context(), dto.TenantSlug, dto.UserID, dto.PIN)
	if err != nil {
		return mapAuthError(c, err)
	}
	return c.JSON(res)
}

func (h *Handlers) listStaff(c *fiber.Ctx) error {
	staff, err := h.auth.LoginableUsers(c.Context(), c.Params("tenantSlug"))
	if err != nil {
		return mapAuthError(c, err)
	}
	return c.JSON(staff)
}

func (h *Handlers) me(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "Sesión inválida")
	}
	return c.JSON(fiber.Map{
		"userId":     u.Subject,
		"tenantId":   u.TenantID,
		"tenantSlug": u.TenantSlug,
		"role":       u.Role,
		"name":       u.Name,
		"email":      u.Email,
	})
}

type changePasswordReq struct {
	CurrentPassword string `json:"currentPassword" validate:"required,min=6"`
	NewPassword     string `json:"newPassword" validate:"required,min=8"`
}

type changePINReq struct {
	CurrentPassword string `json:"currentPassword" validate:"required,min=6"`
	NewPIN          string `json:"newPin" validate:"required,len=4"`
}

func (h *Handlers) changePassword(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "Sesión inválida")
	}
	var dto changePasswordReq
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	if err := h.auth.ChangePassword(c.Context(), u.Subject, dto.CurrentPassword, dto.NewPassword); err != nil {
		return mapAuthError(c, err)
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handlers) changePIN(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "Sesión inválida")
	}
	var dto changePINReq
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	if err := h.auth.ChangePIN(c.Context(), u.Subject, dto.CurrentPassword, dto.NewPIN); err != nil {
		return mapAuthError(c, err)
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handlers) categories(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "Sesión inválida")
	}
	out, err := h.menu.Categories(c.Context(), u.TenantID)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) products(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "Sesión inválida")
	}
	category := c.Query("categorySlug")
	branchId := c.Query("branchId")
	out, err := h.menu.Products(c.Context(), u.TenantID, category, branchId)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) generate(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "Sesión inválida")
	}
	var dto generateQRReq
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	base := c.Protocol() + "://" + c.Hostname()
	out, err := h.qr.GenerateForTable(c.Context(), u.TenantID, dto.BranchID, dto.TableID, base)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) listCodes(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "Sesión inválida")
	}
	out, err := h.qr.ListForBranch(c.Context(), u.TenantID, c.Query("branchId"))
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) resolve(c *fiber.Ctx) error {
	out, err := h.qr.ResolveToken(c.Context(), c.Params("token"))
	if err != nil {
		return httpx.NotFound(c, err.Error())
	}
	return c.JSON(out)
}

func (h *Handlers) publicMenu(c *fiber.Ctx) error {
	ctx, err := h.qr.ResolveToken(c.Context(), c.Params("token"))
	if err != nil {
		return httpx.NotFound(c, err.Error())
	}
	cats, err := h.menu.Categories(c.Context(), ctx.TenantID)
	if err != nil {
		return httpx.FromError(c, err)
	}
	products, err := h.menu.Products(c.Context(), ctx.TenantID, "", "")
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(fiber.Map{
		"tenantId":   ctx.TenantID,
		"branchId":   ctx.BranchID,
		"table":      ctx.Table,
		"zone":       ctx.Zone,
		"categories": cats,
		"products":   products,
	})
}

func (h *Handlers) callWaiter(c *fiber.Ctx) error {
	if err := h.qr.CallWaiter(c.Context(), c.Params("token")); err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(fiber.Map{"ok": true, "message": "Mesero notificado"})
}

func mapAuthError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, auth.ErrInvalidCredentials), errors.Is(err, auth.ErrTenantInvalid):
		return httpx.Unauthorized(c, "Credenciales inválidas")
	case errors.Is(err, auth.ErrAccountLocked):
		return httpx.Forbidden(c, "Cuenta bloqueada por intentos fallidos. Intenta en 15 minutos.")
	case errors.Is(err, auth.ErrCurrentPasswordBad):
		return httpx.BadRequest(c, "La contraseña actual no es correcta")
	default:
		return httpx.FromError(c, err)
	}
}
