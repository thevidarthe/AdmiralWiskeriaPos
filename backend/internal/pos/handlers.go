package pos

import (
	"errors"

	"github.com/admiral/admiral-pro/internal/config"
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
)

type Handlers struct {
	svc *Service
	cfg *config.Config
}

func NewHandlers(svc *Service, cfg *config.Config) *Handlers { return &Handlers{svc: svc, cfg: cfg} }

func (h *Handlers) RegisterPublic(_ fiber.Router) {}

func (h *Handlers) Register(r fiber.Router) {
	r.Get("/sales", h.listOpen)
	r.Get("/sales/:id", h.get)
	r.Post("/sales", h.open)
	r.Post("/sales/:id/items", h.addItems)
	r.Delete("/sales/:id/items/:itemId", h.removeItem)
	r.Post("/sales/:id/close", h.close)
	r.Post("/sales/:id/cancel", middleware.RequireRoles("ADMIN", "MANAGER"), h.cancel)

	if h.cfg != nil && h.cfg.SimulateWeatherEnabled && !h.cfg.IsProd() {
		r.Post("/simulate-weather", middleware.RequireRoles("ADMIN", "MANAGER"), h.simulateWeather)
	}
}

func (h *Handlers) listOpen(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	branchID := c.Query("branchId")
	if branchID == "" {
		return httpx.BadRequest(c, "branchId requerido")
	}
	out, err := h.svc.ListOpenSales(c.Context(), u.TenantID, branchID)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) get(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	sale, err := h.svc.GetSale(c.Context(), u.TenantID, c.Params("id"))
	if err != nil {
		return mapErr(c, err)
	}
	return c.JSON(sale)
}

func (h *Handlers) open(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto OpenSaleInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	sale, err := h.svc.OpenSale(c.Context(), u.TenantID, u.Subject, dto)
	if err != nil {
		return mapErr(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(sale)
}

func (h *Handlers) addItems(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto AddItemsInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	sale, err := h.svc.AddItems(c.Context(), u.TenantID, c.Params("id"), u.Subject, dto)
	if err != nil {
		return mapErr(c, err)
	}
	return c.JSON(sale)
}

func (h *Handlers) removeItem(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	sale, err := h.svc.RemoveItem(c.Context(), u.TenantID, c.Params("id"), c.Params("itemId"))
	if err != nil {
		return mapErr(c, err)
	}
	return c.JSON(sale)
}

func (h *Handlers) close(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto CloseSaleInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	sale, err := h.svc.CloseSale(c.Context(), u.TenantID, c.Params("id"), u.Subject, dto)
	if err != nil {
		return mapErr(c, err)
	}
	return c.JSON(sale)
}

type cancelReq struct {
	Reason string `json:"reason,omitempty"`
}

func (h *Handlers) cancel(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto cancelReq
	_ = c.BodyParser(&dto)
	sale, err := h.svc.CancelSale(c.Context(), u.TenantID, c.Params("id"), u.Subject, dto.Reason)
	if err != nil {
		return mapErr(c, err)
	}
	return c.JSON(sale)
}

func mapErr(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, ErrSaleNotFound):
		return httpx.NotFound(c, "Venta no encontrada")
	case errors.Is(err, ErrTableBusy):
		return httpx.Conflict(c, err.Error())
	case errors.Is(err, ErrSaleNotOpen), errors.Is(err, ErrSalePaid), errors.Is(err, ErrSaleCancelled),
		errors.Is(err, ErrEmptySale), errors.Is(err, ErrPaymentMismatch):
		return httpx.BadRequest(c, err.Error())
	default:
		return httpx.FromError(c, err)
	}
}

type SimulateWeatherInput struct {
	Weather     string  `json:"weather"`
	Temperature float64 `json:"temperature"`
}

func (h *Handlers) simulateWeather(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	if u == nil {
		return httpx.Unauthorized(c, "Sesión inválida")
	}

	var in SimulateWeatherInput
	if err := c.BodyParser(&in); err != nil {
		return httpx.BadRequest(c, "body inválido")
	}
	if in.Weather == "" {
		in.Weather = "rainy"
	}
	if in.Temperature == 0 {
		in.Temperature = 16.0
	}

	eventData := map[string]any{
		"weather":     in.Weather,
		"temperature": in.Temperature,
	}

	err := h.svc.EvaluateRules(c.Context(), u.TenantID, "weather.changed", eventData)
	if err != nil {
		return httpx.FromError(c, err)
	}

	return c.JSON(fiber.Map{
		"status":    "success",
		"message":   "Reglas de clima evaluadas con éxito",
		"eventData": eventData,
		"tenantId":  u.TenantID,
	})
}
