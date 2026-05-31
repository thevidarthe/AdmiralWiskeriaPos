// Package report — reportes y export a Excel.
package report

import (
	"context"
	"fmt"
	"time"

	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

// ─── Tipos públicos ───────────────────────────────────────────

type DailyClose struct {
	Date            string                       `json:"date"`
	Summary         DailySummary                 `json:"summary"`
	PaymentByMethod map[string]map[string]any    `json:"paymentByMethod"`
	TopProducts     []TopProduct                 `json:"topProducts"`
}

type DailySummary struct {
	TotalSales    int     `json:"totalSales"`
	GrossRevenue  float64 `json:"grossRevenue"`
	TotalDiscount float64 `json:"totalDiscount"`
	TotalTax      float64 `json:"totalTax"`
	TotalTip      float64 `json:"totalTip"`
	NetRevenue    float64 `json:"netRevenue"`
	AvgTicket     float64 `json:"avgTicket"`
}

type TopProduct struct {
	ProductID string  `json:"productId"`
	Name      string  `json:"name"`
	Units     float64 `json:"units"`
	Revenue   float64 `json:"revenue"`
}

// DailyClose calcula el cierre diario de una sucursal.
func (s *Service) DailyClose(ctx context.Context, tenantID, branchID string, date time.Time) (*DailyClose, error) {
	start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	end := start.Add(24 * time.Hour)

	type row struct {
		Count      int     `gorm:"column:c"`
		Gross      float64 `gorm:"column:gross"`
		Discount   float64 `gorm:"column:discount"`
		Tax        float64 `gorm:"column:tax"`
		Tip        float64 `gorm:"column:tip"`
	}
	var sum row
	s.db.WithContext(ctx).Raw(`
		SELECT
			COUNT(*) AS c,
			COALESCE(SUM(grand_total), 0) AS gross,
			COALESCE(SUM(discount_total), 0) AS discount,
			COALESCE(SUM(tax_total), 0) AS tax,
			COALESCE(SUM(tip_amount), 0) AS tip
		FROM sales
		WHERE tenant_id = ? AND branch_id = ? AND status = 'PAID'
		  AND opened_at >= ? AND opened_at < ?
	`, tenantID, branchID, start, end).Scan(&sum)

	avg := 0.0
	if sum.Count > 0 {
		avg = sum.Gross / float64(sum.Count)
	}

	// Pagos por método
	type pmRow struct {
		Method string  `gorm:"column:method"`
		Count  int     `gorm:"column:count"`
		Amount float64 `gorm:"column:amount"`
	}
	var pms []pmRow
	s.db.WithContext(ctx).Raw(`
		SELECT p.method, COUNT(*) AS count, COALESCE(SUM(p.amount),0) AS amount
		FROM payments p
		JOIN sales s ON s.id = p.sale_id
		WHERE p.tenant_id = ? AND s.branch_id = ? AND s.status = 'PAID'
		  AND s.opened_at >= ? AND s.opened_at < ?
		GROUP BY p.method
	`, tenantID, branchID, start, end).Scan(&pms)

	paymentByMethod := make(map[string]map[string]any)
	for _, r := range pms {
		paymentByMethod[r.Method] = map[string]any{"count": r.Count, "amount": r.Amount}
	}

	// Top productos
	var tops []TopProduct
	s.db.WithContext(ctx).Raw(`
		SELECT
			si.product_id AS product_id,
			MAX(si.product_name) AS name,
			SUM(si.quantity) AS units,
			SUM(si.line_total) AS revenue
		FROM sale_items si
		JOIN sales s ON s.id = si.sale_id
		WHERE si.tenant_id = ? AND s.branch_id = ? AND s.status = 'PAID'
		  AND s.opened_at >= ? AND s.opened_at < ?
		GROUP BY si.product_id
		ORDER BY revenue DESC
		LIMIT 10
	`, tenantID, branchID, start, end).Scan(&tops)

	return &DailyClose{
		Date: start.Format("2006-01-02"),
		Summary: DailySummary{
			TotalSales:    sum.Count,
			GrossRevenue:  sum.Gross,
			TotalDiscount: sum.Discount,
			TotalTax:      sum.Tax,
			TotalTip:      sum.Tip,
			NetRevenue:    sum.Gross - sum.Tax,
			AvgTicket:     avg,
		},
		PaymentByMethod: paymentByMethod,
		TopProducts:     tops,
	}, nil
}

// ExportDailyClose genera el Excel del cierre diario.
func (s *Service) ExportDailyClose(ctx context.Context, tenantID, branchID string, date time.Time) ([]byte, string, error) {
	rep, err := s.DailyClose(ctx, tenantID, branchID, date)
	if err != nil {
		return nil, "", err
	}
	f := excelize.NewFile()
	defer f.Close()

	// Hoja Resumen
	f.SetSheetName("Sheet1", "Resumen")
	rows := [][]any{
		{"Concepto", "Valor"},
		{"Fecha", rep.Date},
		{"Ventas totales", rep.Summary.TotalSales},
		{"Ingreso bruto", rep.Summary.GrossRevenue},
		{"Descuentos", rep.Summary.TotalDiscount},
		{"IVA", rep.Summary.TotalTax},
		{"Propinas", rep.Summary.TotalTip},
		{"Ingreso neto", rep.Summary.NetRevenue},
		{"Ticket promedio", rep.Summary.AvgTicket},
	}
	for i, r := range rows {
		for j, v := range r {
			cell, _ := excelize.CoordinatesToCellName(j+1, i+1)
			f.SetCellValue("Resumen", cell, v)
		}
	}

	// Hoja Pagos
	idx, _ := f.NewSheet("Pagos")
	f.SetSheetRow("Pagos", "A1", &[]any{"Método", "Cantidad", "Monto total"})
	row := 2
	for m, d := range rep.PaymentByMethod {
		f.SetSheetRow("Pagos", fmt.Sprintf("A%d", row), &[]any{m, d["count"], d["amount"]})
		row++
	}

	// Hoja Top productos
	f.NewSheet("Top productos")
	f.SetSheetRow("Top productos", "A1", &[]any{"Producto", "Unidades", "Ingresos"})
	for i, p := range rep.TopProducts {
		f.SetSheetRow("Top productos", fmt.Sprintf("A%d", i+2), &[]any{p.Name, p.Units, p.Revenue})
	}

	f.SetActiveSheet(idx)
	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, "", err
	}
	name := fmt.Sprintf("cierre-%s.xlsx", rep.Date)
	return buf.Bytes(), name, nil
}

// ─── HTTP ─────────────────────────────────────────────────────

type Handlers struct{ svc *Service }

func NewHandlers(svc *Service) *Handlers { return &Handlers{svc: svc} }

func (h *Handlers) Register(r fiber.Router) {
	r.Get("/daily-close", h.daily)
	r.Get("/daily-close/export", h.exportDaily)
}

func (h *Handlers) daily(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	branchID := c.Query("branchId")
	if branchID == "" {
		return httpx.BadRequest(c, "branchId requerido")
	}
	date := parseDate(c.Query("date"))
	out, err := h.svc.DailyClose(c.Context(), u.TenantID, branchID, date)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) exportDaily(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	branchID := c.Query("branchId")
	if branchID == "" {
		return httpx.BadRequest(c, "branchId requerido")
	}
	date := parseDate(c.Query("date"))
	buf, name, err := h.svc.ExportDailyClose(c.Context(), u.TenantID, branchID, date)
	if err != nil {
		return httpx.FromError(c, err)
	}
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", "attachment; filename="+name)
	return c.Send(buf)
}

func parseDate(s string) time.Time {
	if s == "" {
		return time.Now()
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return time.Now()
	}
	return t
}
