// Package auth — HTTP handlers Fiber.
package auth

import (
	"errors"
	"io"
	"strconv"
	"strings"

	"github.com/admiral/admiral-pro/internal/ctxkeys"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
)

// Handlers expone los endpoints HTTP de auth.
type Handlers struct {
	svc *Service
}

func NewHandlers(svc *Service) *Handlers { return &Handlers{svc: svc} }

// Register monta las rutas en el router dado.
// Las rutas /login y /pin son PÚBLICAS — no requieren JWT.
// Las rutas /me/* requieren JWT (se montan con un grupo separado).
func (h *Handlers) RegisterPublic(r fiber.Router) {
	r.Post("/login", h.LoginPassword)
	r.Post("/pin", h.LoginPIN)
	r.Get("/users/:tenantSlug", h.ListLoginableUsers)
}

func (h *Handlers) RegisterPrivate(r fiber.Router) {
	r.Get("/me", h.Me)
	r.Put("/me/password", h.ChangePassword)
	r.Put("/me/pin", h.ChangePIN)
	r.Post("/attendance/clock", h.ClockInOut)
	r.Get("/attendance/history", h.GetAttendanceHistory)
}

// ─── DTOs (peticiones entrantes) ──────────────────────────────

type loginPasswordReq struct {
	TenantSlug string `json:"tenantSlug" validate:"required"`
	Email      string `json:"email" validate:"required,email"`
	Password   string `json:"password" validate:"required,min=6"`
}

type loginPINReq struct {
	TenantSlug string `json:"tenantSlug" validate:"required"`
	UserID     string `json:"userId" validate:"required,uuid"`
	PIN        string `json:"pin" validate:"required,len=4"`
}

type changePasswordReq struct {
	CurrentPassword string `json:"currentPassword" validate:"required,min=6"`
	NewPassword     string `json:"newPassword" validate:"required,min=8"`
}

type changePINReq struct {
	CurrentPassword string `json:"currentPassword" validate:"required,min=6"`
	NewPIN          string `json:"newPin" validate:"required,len=4"`
}

// ─── Handlers ─────────────────────────────────────────────────

func (h *Handlers) LoginPassword(c *fiber.Ctx) error {
	var dto loginPasswordReq
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	res, err := h.svc.LoginWithPassword(c.Context(), dto.TenantSlug, dto.Email, dto.Password)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(res)
}

func (h *Handlers) LoginPIN(c *fiber.Ctx) error {
	var dto loginPINReq
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	// PIN debe ser 4 dígitos numéricos
	if !isDigits(dto.PIN, 4) {
		return httpx.BadRequest(c, "PIN debe ser exactamente 4 dígitos numéricos")
	}
	res, err := h.svc.LoginWithPIN(c.Context(), dto.TenantSlug, dto.UserID, dto.PIN)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(res)
}

func (h *Handlers) ListLoginableUsers(c *fiber.Ctx) error {
	users, err := h.svc.LoginableUsers(c.Context(), c.Params("tenantSlug"))
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(users)
}

func (h *Handlers) Me(c *fiber.Ctx) error {
	u := currentUser(c)
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

func (h *Handlers) ChangePassword(c *fiber.Ctx) error {
	u := currentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "")
	}
	var dto changePasswordReq
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	if err := h.svc.ChangePassword(c.Context(), u.Subject, dto.CurrentPassword, dto.NewPassword); err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handlers) ChangePIN(c *fiber.Ctx) error {
	u := currentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "")
	}
	var dto changePINReq
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	if !isDigits(dto.NewPIN, 4) {
		return httpx.BadRequest(c, "PIN debe ser 4 dígitos numéricos")
	}
	if err := h.svc.ChangePIN(c.Context(), u.Subject, dto.CurrentPassword, dto.NewPIN); err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"ok": true})
}

// ─── Helpers ──────────────────────────────────────────────────

func currentUser(c *fiber.Ctx) *Claims {
	v, ok := c.Locals(ctxkeys.CtxUser).(*Claims)
	if !ok {
		return nil
	}
	return v
}

func mapError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, ErrInvalidCredentials), errors.Is(err, ErrTenantInvalid):
		return httpx.Unauthorized(c, "Credenciales inválidas")
	case errors.Is(err, ErrAccountLocked):
		return httpx.Forbidden(c, "Cuenta bloqueada por intentos fallidos. Intenta en 15 minutos.")
	case errors.Is(err, ErrCurrentPasswordBad):
		return httpx.BadRequest(c, "La contraseña actual no es correcta")
	default:
		return httpx.FromError(c, err)
	}
}

func isDigits(s string, n int) bool {
	if len(s) != n {
		return false
	}
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return false
		}
	}
	return !strings.ContainsAny(s, " ")
}

// ClockInOut procesa el registro de entrada/salida (multipart upload + geolocalización + IP).
func (h *Handlers) ClockInOut(c *fiber.Ctx) error {
	u := currentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "Sesión inválida")
	}

	eventType := c.FormValue("eventType")
	if eventType != "CLOCK_IN" && eventType != "CLOCK_OUT" {
		return httpx.BadRequest(c, "eventType debe ser CLOCK_IN o CLOCK_OUT")
	}

	branchID := c.FormValue("branchId")
	if branchID == "" {
		var firstBranch struct {
			ID string
		}
		if err := h.svc.db.Table("branches").Select("id").Where("tenant_id = ? AND active = true", u.TenantID).Order("created_at ASC").First(&firstBranch).Error; err == nil {
			branchID = firstBranch.ID
		} else {
			return httpx.BadRequest(c, "No se encontró ninguna sucursal activa para tu organización")
		}
	}

	// Procesar la foto subida
	var photoBytes []byte
	var photoExt = "jpg"
	file, err := c.FormFile("photo")
	if err == nil && file != nil {
		if file.Size > 3*1024*1024 {
			return httpx.BadRequest(c, "La foto excede el límite de 3MB")
		}

		openedFile, err := file.Open()
		if err == nil {
			defer openedFile.Close()
			photoBytes, _ = io.ReadAll(openedFile)

			if strings.HasSuffix(strings.ToLower(file.Filename), ".png") {
				photoExt = "png"
			} else if strings.HasSuffix(strings.ToLower(file.Filename), ".jpeg") || strings.HasSuffix(strings.ToLower(file.Filename), ".jpg") {
				photoExt = "jpg"
			}
		}
	}

	// Procesar coordenadas de geolocalización
	var lat *float64
	var lon *float64
	latVal := c.FormValue("latitude")
	lonVal := c.FormValue("longitude")
	if latVal != "" {
		if l, err := strconv.ParseFloat(latVal, 64); err == nil {
			lat = &l
		}
	}
	if lonVal != "" {
		if l, err := strconv.ParseFloat(lonVal, 64); err == nil {
			lon = &l
		}
	}

	// Extraer dirección IP (con soporte de Proxy Inverso)
	ip := c.IP()
	if xff := c.Get("X-Forwarded-For"); xff != "" {
		ip = strings.Split(xff, ",")[0]
	}
	ua := c.Get("User-Agent")

	res, err := h.svc.ClockInOut(c.Context(), u.TenantID, branchID, u.Subject, eventType, photoBytes, photoExt, lat, lon, ip, ua)
	if err != nil {
		return httpx.FromError(c, err)
	}

	return c.JSON(res)
}

// GetAttendanceHistory obtiene el historial de marcaciones del usuario actual.
func (h *Handlers) GetAttendanceHistory(c *fiber.Ctx) error {
	u := currentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "Sesión inválida")
	}

	res, err := h.svc.GetAttendanceHistory(c.Context(), u.TenantID, u.Subject)
	if err != nil {
		return httpx.FromError(c, err)
	}

	return c.JSON(res)
}
