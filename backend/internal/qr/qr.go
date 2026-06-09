// Package qr — generación y resolución pública de QR por mesa.
package qr

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/admiral/admiral-pro/internal/event"
	"github.com/admiral/admiral-pro/internal/menu"
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/internal/pos"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	qrcode "github.com/skip2/go-qrcode"
	"gorm.io/gorm"
)

type Service struct {
	db   *gorm.DB
	menu *menu.Service
	bus  *event.Bus
}

func NewService(db *gorm.DB, m *menu.Service, bus *event.Bus) *Service {
	return &Service{db: db, menu: m, bus: bus}
}

type GeneratedQR struct {
	domain.QRCode
	URL string `json:"url"`
}

func (s *Service) GenerateForTable(ctx context.Context, tenantID, branchID, tableID, baseURL string) (*GeneratedQR, error) {
	// Desactivar QR previos
	if err := s.db.WithContext(ctx).
		Model(&domain.QRCode{}).
		Where("tenant_id = ? AND table_id = ? AND active = true", tenantID, tableID).
		Update("active", false).Error; err != nil {
		return nil, err
	}

	q := domain.QRCode{
		ID:       uuid.NewString(),
		Token:    uuid.NewString(),
		TenantID: tenantID,
		BranchID: branchID,
		TableID:  tableID,
		Active:   true,
	}
	if err := s.db.WithContext(ctx).Create(&q).Error; err != nil {
		return nil, err
	}

	url := strings.TrimRight(baseURL, "/") + "/qr?token=" + q.Token
	png, err := qrcode.Encode(url, qrcode.High, 512)
	if err == nil {
		// guardamos como base64 dentro de un data URI para fácil renderizado en cualquier <img>
		q.SvgData = "data:image/png;base64," + encodeBase64(png)
		_ = s.db.WithContext(ctx).Model(&q).Update("svg_data", q.SvgData).Error
	}

	return &GeneratedQR{QRCode: q, URL: url}, nil
}

func (s *Service) GenerateAllForBranch(ctx context.Context, tenantID, branchID, baseURL string) ([]domain.QRCode, error) {
	var tables []domain.Table
	if err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND branch_id = ?", tenantID, branchID).
		Find(&tables).Error; err != nil {
		return nil, err
	}

	var generated []domain.QRCode
	for _, t := range tables {
		g, err := s.GenerateForTable(ctx, tenantID, branchID, t.ID, baseURL)
		if err != nil {
			return nil, err
		}
		generated = append(generated, g.QRCode)
	}

	return generated, nil
}

func (s *Service) ListForBranch(ctx context.Context, tenantID, branchID string) ([]domain.QRCode, error) {
	var out []domain.QRCode
	err := s.db.WithContext(ctx).
		Preload("Table.Zone").
		Where("tenant_id = ? AND branch_id = ? AND active = true", tenantID, branchID).
		Find(&out).Error
	return out, err
}

type ResolvedToken struct {
	TenantID string                  `json:"tenantId"`
	BranchID string                  `json:"branchId"`
	Table    map[string]string       `json:"table"`
	Zone     map[string]string       `json:"zone"`
}

func (s *Service) ResolveToken(ctx context.Context, token string) (*ResolvedToken, error) {
	var q domain.QRCode
	err := s.db.WithContext(ctx).
		Preload("Table.Zone").
		First(&q, "token = ?", token).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("QR inválido")
		}
		return nil, err
	}
	if !q.Active {
		return nil, errors.New("QR inactivo")
	}
	if q.ExpiresAt != nil && q.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("QR expirado")
	}
	r := &ResolvedToken{
		TenantID: q.TenantID,
		BranchID: q.BranchID,
		Table:    map[string]string{"id": q.Table.ID, "number": q.Table.Number},
	}
	if q.Table.Zone != nil {
		r.Zone = map[string]string{"name": q.Table.Zone.Name, "type": string(q.Table.Zone.Type)}
	}
	return r, nil
}

func (s *Service) CallWaiter(ctx context.Context, token string) error {
	var q domain.QRCode
	if err := s.db.WithContext(ctx).Preload("Table").First(&q, "token = ?", token).Error; err != nil {
		return err
	}
	s.bus.Emit("qr.waiterCalled", map[string]any{
		"tenantId":    q.TenantID,
		"branchId":    q.BranchID,
		"tableId":     q.TableID,
		"tableNumber": q.Table.Number,
	})
	return nil
}

// ─── HTTP ─────────────────────────────────────────────────────

type Handlers struct {
	svc  *Service
	menu *menu.Service
	pos  *pos.Service
}

func NewHandlers(svc *Service, m *menu.Service, p *pos.Service) *Handlers {
	return &Handlers{svc: svc, menu: m, pos: p}
}

// RegisterPublic monta rutas SIN auth (las usa el cliente del bar).
func (h *Handlers) RegisterPublic(r fiber.Router) {
	r.Get("/resolve/:token", h.resolve)
	r.Get("/menu/:token", h.publicMenu)
	r.Post("/call-waiter/:token", h.callWaiter)
	r.Post("/orders/:token", h.submitOrder)

	r.Get("/split/:token", h.getSplit)
	r.Post("/split/:token", h.initiateSplit)
	r.Post("/split/:token/pay/:shareId", h.payShare)
}

// RegisterPrivate monta rutas administrativas.
func (h *Handlers) RegisterPrivate(r fiber.Router) {
	r.Post("/codes", middleware.RequireRoles("ADMIN", "MANAGER"), h.generate)
	r.Post("/codes/generate-all", middleware.RequireRoles("ADMIN", "MANAGER"), h.generateAll)
	r.Get("/codes", h.list)
}

type genReq struct {
	BranchID string `json:"branchId" validate:"required,uuid"`
	TableID  string `json:"tableId" validate:"required,uuid"`
}

func (h *Handlers) generate(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto genReq
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	base := c.Protocol() + "://" + c.Hostname()
	out, err := h.svc.GenerateForTable(c.Context(), u.TenantID, dto.BranchID, dto.TableID, base)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) generateAll(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto struct {
		BranchID string `json:"branchId" validate:"required,uuid"`
	}
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	base := c.Protocol() + "://" + c.Hostname()
	base = strings.Replace(base, ":4000", ":3000", 1) // Maps :4000 to :3000 for local testing redirect
	out, err := h.svc.GenerateAllForBranch(c.Context(), u.TenantID, dto.BranchID, base)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}


func (h *Handlers) list(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	out, err := h.svc.ListForBranch(c.Context(), u.TenantID, c.Query("branchId"))
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) resolve(c *fiber.Ctx) error {
	out, err := h.svc.ResolveToken(c.Context(), c.Params("token"))
	if err != nil {
		return httpx.NotFound(c, err.Error())
	}
	return c.JSON(out)
}

func (h *Handlers) publicMenu(c *fiber.Ctx) error {
	ctx, err := h.svc.ResolveToken(c.Context(), c.Params("token"))
	if err != nil {
		return httpx.NotFound(c, err.Error())
	}
	cats, _ := h.menu.Categories(c.Context(), ctx.TenantID)
	products, _ := h.menu.Products(c.Context(), ctx.TenantID, "", "")
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
	if err := h.svc.CallWaiter(c.Context(), c.Params("token")); err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(fiber.Map{"ok": true, "message": "Mesero notificado"})
}

type orderLineReq struct {
	ProductID string  `json:"productId" validate:"required,uuid"`
	Quantity  float64 `json:"quantity" validate:"required,gt=0"`
}

type submitOrderReq struct {
	Lines []orderLineReq `json:"lines" validate:"required,min=1,dive"`
	Notes string         `json:"notes,omitempty"`
}

func (h *Handlers) submitOrder(c *fiber.Ctx) error {
	token := c.Params("token")
	ctx := h.svc.ResolveToken

	resolved, err := ctx(c.Context(), token)
	if err != nil {
		return httpx.NotFound(c, err.Error())
	}

	var dto submitOrderReq
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}

	var validProducts []domain.Product
	productIDs := make([]string, len(dto.Lines))
	for i, l := range dto.Lines {
		productIDs[i] = l.ProductID
	}
	if err := h.svc.db.WithContext(c.Context()).
		Where("id IN ? AND tenant_id = ? AND available = true", productIDs, resolved.TenantID).
		Find(&validProducts).Error; err != nil {
		return httpx.FromError(c, err)
	}

	if len(validProducts) != len(dto.Lines) {
		return httpx.BadRequest(c, "Uno o más productos no son válidos o no están disponibles")
	}

	priceMap := make(map[string]decimal.Decimal)
	for _, p := range validProducts {
		priceMap[p.ID] = p.BasePrice
	}

	var existingSale *domain.Sale
	var sale domain.Sale
	saleErr := h.svc.db.WithContext(c.Context()).
		Where("tenant_id = ? AND branch_id = ? AND table_id = ? AND status IN ?",
			resolved.TenantID, resolved.BranchID, resolved.Table["id"],
			[]domain.SaleStatus{domain.SaleOpen, domain.SalePendingPayment}).
		First(&sale).Error

	if saleErr == nil {
		existingSale = &sale
	}

	if existingSale != nil {
		lines := make([]pos.AddItemsLine, len(dto.Lines))
		for i, l := range dto.Lines {
			lines[i] = pos.AddItemsLine{
				ProductID: l.ProductID,
				Quantity:  l.Quantity,
				UnitPrice: priceMap[l.ProductID],
			}
		}
		updated, err := h.pos.AddItemsFromQR(c.Context(), existingSale.TenantID, existingSale.ID, lines)
		if err != nil {
			return httpx.FromError(c, err)
		}
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"saleId": updated.ID,
			"status": updated.Status,
			"items":  len(updated.Items),
			"total":  updated.GrandTotal,
		})
	}

	openInput := pos.OpenSaleInput{
		BranchID: resolved.BranchID,
		TableID:  resolved.Table["id"],
		Source:   domain.SourceQR,
	}
	newSale, err := h.pos.OpenSale(c.Context(), resolved.TenantID, "system", openInput)
	if err != nil {
		return httpx.FromError(c, err)
	}

	lines := make([]pos.AddItemsLine, len(dto.Lines))
	for i, l := range dto.Lines {
		lines[i] = pos.AddItemsLine{
			ProductID: l.ProductID,
			Quantity:  l.Quantity,
			UnitPrice: priceMap[l.ProductID],
		}
	}
	updated, err := h.pos.AddItemsFromQR(c.Context(), newSale.TenantID, newSale.ID, lines)
	if err != nil {
		return httpx.FromError(c, err)
	}

	h.svc.bus.Emit("order.created", map[string]any{
		"tenantId":    resolved.TenantID,
		"branchId":    resolved.BranchID,
		"tableId":     resolved.Table["id"],
		"tableNumber": resolved.Table["number"],
		"saleId":      updated.ID,
		"source":      "QR",
	})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"saleId": updated.ID,
		"status": updated.Status,
		"items":  len(updated.Items),
		"total":  updated.GrandTotal,
	})
}

func (h *Handlers) getSplit(c *fiber.Ctx) error {
	sale, err := h.getActiveSaleForToken(c.Context(), c.Params("token"))
	if err != nil {
		return httpx.NotFound(c, err.Error())
	}
	split, err := h.pos.GetSplit(c.Context(), sale.TenantID, sale.ID)
	if err != nil {
		if errors.Is(err, pos.ErrSplitNotFound) {
			// No hay split iniciado, retornar el gran total disponible para dividir
			return c.JSON(fiber.Map{
				"saleId":     sale.ID,
				"grandTotal": sale.GrandTotal,
				"status":     "NOT_SPLIT",
			})
		}
		return httpx.FromError(c, err)
	}
	return c.JSON(split)
}

func (h *Handlers) initiateSplit(c *fiber.Ctx) error {
	sale, err := h.getActiveSaleForToken(c.Context(), c.Params("token"))
	if err != nil {
		return httpx.NotFound(c, err.Error())
	}
	var dto pos.InitiateSplitInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	split, err := h.pos.InitiateSplit(c.Context(), sale.TenantID, sale.ID, dto)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(split)
}

func (h *Handlers) payShare(c *fiber.Ctx) error {
	sale, err := h.getActiveSaleForToken(c.Context(), c.Params("token"))
	if err != nil {
		return httpx.NotFound(c, err.Error())
	}
	var dto pos.PayShareInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	share, err := h.pos.PayShare(c.Context(), sale.TenantID, c.Params("shareId"), dto)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(share)
}

func (h *Handlers) getActiveSaleForToken(ctx context.Context, token string) (*domain.Sale, error) {
	ctxToken, err := h.svc.ResolveToken(ctx, token)
	if err != nil {
		return nil, err
	}
	var sale domain.Sale
	err = h.svc.db.WithContext(ctx).
		Preload("Table").
		Where("tenant_id = ? AND branch_id = ? AND table_id = ? AND status IN ?",
			ctxToken.TenantID, ctxToken.BranchID, ctxToken.Table["id"],
			[]domain.SaleStatus{domain.SaleOpen, domain.SalePendingPayment}).
		First(&sale).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("no hay una orden activa abierta en esta mesa")
		}
		return nil, err
	}
	return &sale, nil
}
