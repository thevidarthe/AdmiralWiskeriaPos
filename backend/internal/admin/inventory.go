package admin

import (
	"context"
	"errors"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type InventoryService struct{ db *gorm.DB }

func NewInventoryService(db *gorm.DB) *InventoryService { return &InventoryService{db: db} }

type MovementInput struct {
	BranchID      string                `json:"branchId" validate:"required,uuid"`
	ProductID     string                `json:"productId" validate:"required,uuid"`
	MovementType  domain.MovementType   `json:"movementType" validate:"required"`
	Quantity      float64               `json:"quantity" validate:"required,gt=0"`
	UnitCost      float64               `json:"unitCost,omitempty"`
	ReferenceType string                `json:"referenceType,omitempty"`
	ReferenceID   string                `json:"referenceId,omitempty"`
	Notes         string                `json:"notes,omitempty"`
}

type StockRow struct {
	ProductID     string  `json:"productId"`
	ProductName   string  `json:"productName"`
	SKU           string  `json:"sku,omitempty"`
	CategoryName  string  `json:"categoryName"`
	BranchID      string  `json:"branchId"`
	BranchName    string  `json:"branchName"`
	Quantity      float64 `json:"quantity"`
	MinStock      float64 `json:"minStock"`
	LowStock      bool    `json:"lowStock"`
	UpdatedAt     string  `json:"updatedAt"`
}

// CurrentStock devuelve el stock vigente, con marca de "bajo".
func (s *InventoryService) CurrentStock(ctx context.Context, tenantID, branchID string) ([]StockRow, error) {
	q := s.db.WithContext(ctx).Raw(`
		SELECT
			p.id AS product_id,
			p.name AS product_name,
			p.sku AS sku,
			c.name AS category_name,
			si.branch_id,
			b.name AS branch_name,
			si.quantity,
			COALESCE(p.min_stock, 0) AS min_stock,
			(p.min_stock IS NOT NULL AND si.quantity <= p.min_stock) AS low_stock,
			to_char(si.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at
		FROM stock_items si
		JOIN products p ON p.id = si.product_id
		JOIN categories c ON c.id = p.category_id
		JOIN branches b ON b.id = si.branch_id
		WHERE si.tenant_id = ? `+branchFilter(branchID)+`
		ORDER BY low_stock DESC, p.name ASC
	`, sqlArgs(tenantID, branchID)...)

	var rows []StockRow
	err := q.Scan(&rows).Error
	return rows, err
}

func (s *InventoryService) LowStock(ctx context.Context, tenantID, branchID string) ([]StockRow, error) {
	all, err := s.CurrentStock(ctx, tenantID, branchID)
	if err != nil {
		return nil, err
	}
	out := make([]StockRow, 0)
	for _, r := range all {
		if r.LowStock {
			out = append(out, r)
		}
	}
	return out, nil
}

type ValueRow struct {
	BranchID       string  `json:"branchId"`
	BranchName     string  `json:"branchName"`
	Category       string  `json:"category"`
	ProductCount   int     `json:"productCount"`
	TotalCostValue float64 `json:"totalCostValue"`
	TotalSaleValue float64 `json:"totalSaleValue"`
}

func (s *InventoryService) Value(ctx context.Context, tenantID, branchID string) ([]ValueRow, error) {
	q := s.db.WithContext(ctx).Raw(`
		SELECT
			si.branch_id,
			b.name AS branch_name,
			c.name AS category,
			COUNT(si.product_id) AS product_count,
			SUM(si.quantity * COALESCE(p.cost_price, 0)) AS total_cost_value,
			SUM(si.quantity * p.base_price) AS total_sale_value
		FROM stock_items si
		JOIN products p ON p.id = si.product_id
		JOIN categories c ON c.id = p.category_id
		JOIN branches b ON b.id = si.branch_id
		WHERE si.tenant_id = ? `+branchFilter(branchID)+`
		GROUP BY si.branch_id, b.name, c.name
		ORDER BY total_cost_value DESC
	`, sqlArgs(tenantID, branchID)...)

	var rows []ValueRow
	err := q.Scan(&rows).Error
	return rows, err
}

func (s *InventoryService) CreateMovement(ctx context.Context, tenantID, userID string, in MovementInput) (*domain.InventoryMovement, error) {
	var prod domain.Product
	if err := s.db.WithContext(ctx).First(&prod, "id = ? AND tenant_id = ?", in.ProductID, tenantID).Error; err != nil {
		return nil, errors.New("producto no encontrado")
	}

	mov := domain.InventoryMovement{
		TenantID:      tenantID,
		BranchID:      in.BranchID,
		ProductID:     in.ProductID,
		MovementType:  in.MovementType,
		Quantity:      decimal.NewFromFloat(in.Quantity),
		ReferenceType: in.ReferenceType,
		ReferenceID:   in.ReferenceID,
		Notes:         in.Notes,
		CreatedBy:     userID,
	}
	if in.UnitCost > 0 {
		uc := decimal.NewFromFloat(in.UnitCost)
		mov.UnitCost = &uc
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&mov).Error; err != nil {
			return err
		}
		// Upsert del stock
		delta := mov.Quantity
		if isOutgoing(in.MovementType) {
			delta = delta.Neg()
		}
		var st domain.StockItem
		err := tx.Where("branch_id = ? AND product_id = ?", in.BranchID, in.ProductID).First(&st).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return tx.Create(&domain.StockItem{
				TenantID: tenantID, BranchID: in.BranchID, ProductID: in.ProductID, Quantity: delta,
			}).Error
		}
		if err != nil {
			return err
		}
		return tx.Model(&st).Update("quantity", st.Quantity.Add(delta)).Error
	})
	return &mov, err
}

type PhysicalCountInput struct {
	BranchID string                 `json:"branchId" validate:"required,uuid"`
	Items    []PhysicalCountLine    `json:"items" validate:"required,min=1,dive"`
}
type PhysicalCountLine struct {
	ProductID       string  `json:"productId" validate:"required,uuid"`
	CountedQuantity float64 `json:"countedQuantity" validate:"required,gte=0"`
	Notes           string  `json:"notes,omitempty"`
}

func (s *InventoryService) PhysicalCount(ctx context.Context, tenantID, userID string, in PhysicalCountInput) (any, error) {
	results := make([]any, 0)
	for _, it := range in.Items {
		var st domain.StockItem
		_ = s.db.WithContext(ctx).Where("branch_id = ? AND product_id = ?", in.BranchID, it.ProductID).First(&st).Error
		current, _ := st.Quantity.Float64()
		diff := it.CountedQuantity - current
		if diff == 0 {
			continue
		}
		mt := domain.MovInAdjustment
		if diff < 0 {
			mt = domain.MovOutAdjustment
		}
		mov, err := s.CreateMovement(ctx, tenantID, userID, MovementInput{
			BranchID:      in.BranchID,
			ProductID:     it.ProductID,
			MovementType:  mt,
			Quantity:      absF(diff),
			ReferenceType: "physical_count",
			Notes:         "Conteo físico. " + it.Notes,
		})
		if err != nil {
			return nil, err
		}
		results = append(results, map[string]any{"productId": it.ProductID, "adjusted": diff, "movement": mov})
	}
	return map[string]any{"adjustedCount": len(results), "results": results}, nil
}

func isOutgoing(t domain.MovementType) bool {
	switch t {
	case domain.MovOutSale, domain.MovOutWaste, domain.MovOutTransfer, domain.MovOutAdjustment:
		return true
	}
	return false
}

func absF(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}

func branchFilter(branchID string) string {
	if branchID != "" {
		return "AND si.branch_id = ?"
	}
	return ""
}

func sqlArgs(tenantID, branchID string) []any {
	args := []any{tenantID}
	if branchID != "" {
		args = append(args, branchID)
	}
	return args
}

// ─── HTTP ─────────────────────────────────────────────────────

type InventoryHandlers struct{ svc *InventoryService }

func NewInventoryHandlers(svc *InventoryService) *InventoryHandlers {
	return &InventoryHandlers{svc: svc}
}

func (h *InventoryHandlers) Register(r fiber.Router) {
	r.Get("/stock", h.stock)
	r.Get("/low-stock", h.lowStock)
	r.Get("/value", h.value)
	r.Post("/movements", h.movement)
	r.Post("/physical-count", h.physicalCount)
}

func (h *InventoryHandlers) stock(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	out, err := h.svc.CurrentStock(c.Context(), u.TenantID, c.Query("branchId"))
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *InventoryHandlers) lowStock(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	out, err := h.svc.LowStock(c.Context(), u.TenantID, c.Query("branchId"))
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *InventoryHandlers) value(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	out, err := h.svc.Value(c.Context(), u.TenantID, c.Query("branchId"))
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *InventoryHandlers) movement(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto MovementInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	out, err := h.svc.CreateMovement(c.Context(), u.TenantID, u.Subject, dto)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(out)
}

func (h *InventoryHandlers) physicalCount(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto PhysicalCountInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	out, err := h.svc.PhysicalCount(c.Context(), u.TenantID, u.Subject, dto)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}
