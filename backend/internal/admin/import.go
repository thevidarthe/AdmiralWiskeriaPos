package admin

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
	"github.com/shopspring/decimal"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type ImportService struct{ db *gorm.DB }

func NewImportService(db *gorm.DB) *ImportService { return &ImportService{db: db} }

type ImportReport struct {
	Total             int                      `json:"total"`
	Created           int                      `json:"created"`
	Updated           int                      `json:"updated"`
	CategoriesCreated int                      `json:"categoriesCreated"`
	Errors            []map[string]any         `json:"errors"`
}

// Importa productos desde un buffer Excel/CSV.
// Columnas esperadas: categoria, nombre, precio, costo, sku, codigo_barras,
// unidad, stock_inicial, stock_minimo, controlar_inventario, disponible,
// descripcion, iva_porcentaje.
func (s *ImportService) ImportProducts(ctx context.Context, tenantID, userID string, fileData []byte, branchID string) (*ImportReport, error) {
	xf, err := excelize.OpenReader(bytes.NewReader(fileData))
	if err != nil {
		return nil, fmt.Errorf("archivo inválido: %w", err)
	}
	defer xf.Close()

	sheets := xf.GetSheetList()
	if len(sheets) == 0 {
		return nil, errors.New("archivo sin hojas")
	}
	rows, err := xf.GetRows(sheets[0])
	if err != nil {
		return nil, err
	}
	if len(rows) < 2 {
		return nil, errors.New("archivo vacío (sin filas de datos)")
	}

	header := normalizeRow(rows[0])
	colMap := map[string]int{}
	for i, h := range header {
		colMap[h] = i
	}
	required := []string{"categoria", "nombre", "precio"}
	for _, c := range required {
		if _, ok := colMap[c]; !ok {
			return nil, fmt.Errorf("falta columna requerida: %s", c)
		}
	}

	rep := &ImportReport{Total: len(rows) - 1, Errors: make([]map[string]any, 0)}
	catCache := map[string]string{}

	// Asegurar categorías
	for i := 1; i < len(rows); i++ {
		raw := strings.TrimSpace(getCol(rows[i], colMap["categoria"]))
		if raw == "" {
			continue
		}
		key := strings.ToLower(raw)
		if _, ok := catCache[key]; ok {
			continue
		}
		slug := slugify(raw)
		var c domain.Category
		err := s.db.WithContext(ctx).Where("tenant_id = ? AND slug = ?", tenantID, slug).First(&c).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c = domain.Category{TenantID: tenantID, Name: capitalize(raw), Slug: slug}
			if err := s.db.WithContext(ctx).Create(&c).Error; err != nil {
				rep.Errors = append(rep.Errors, map[string]any{"row": i + 1, "error": err.Error()})
				continue
			}
			rep.CategoriesCreated++
		}
		catCache[key] = c.ID
	}

	// Procesar productos
	for i := 1; i < len(rows); i++ {
		row := rows[i]
		rowNum := i + 1
		nombre := strings.TrimSpace(getCol(row, colMap["nombre"]))
		if nombre == "" {
			continue
		}
		precio := parseFloat(getCol(row, colMap["precio"]))
		if precio <= 0 {
			rep.Errors = append(rep.Errors, map[string]any{"row": rowNum, "error": "precio inválido"})
			continue
		}
		catRaw := strings.ToLower(strings.TrimSpace(getCol(row, colMap["categoria"])))
		catID, ok := catCache[catRaw]
		if !ok {
			rep.Errors = append(rep.Errors, map[string]any{"row": rowNum, "error": "categoría inválida"})
			continue
		}

		sku := strings.TrimSpace(getCol(row, colMap["sku"]))
		costo := parseFloat(getCol(row, colMap["costo"]))
		barcode := strings.TrimSpace(getCol(row, colMap["codigo_barras"]))
		unit := strings.ToUpper(strings.TrimSpace(getCol(row, colMap["unidad"])))
		if unit == "" {
			unit = "UNIT"
		}
		stockIni := parseFloat(getCol(row, colMap["stock_inicial"]))
		stockMin := parseFloat(getCol(row, colMap["stock_minimo"]))
		desc := strings.TrimSpace(getCol(row, colMap["descripcion"]))
		ivaPct := parseFloat(getCol(row, colMap["iva_porcentaje"]))
		taxRate := 0.19
		if ivaPct > 0 {
			taxRate = ivaPct / 100.0
		}

		// Buscar producto existente por SKU o nombre
		var prod domain.Product
		if sku != "" {
			s.db.WithContext(ctx).Where("tenant_id = ? AND sku = ?", tenantID, sku).First(&prod)
		}
		if prod.ID == "" {
			s.db.WithContext(ctx).Where("tenant_id = ? AND lower(name) = lower(?)", tenantID, nombre).First(&prod)
		}

		dataMap := map[string]any{
			"category_id":     catID,
			"name":            nombre,
			"sku":             sku,
			"barcode":         barcode,
			"base_price":      decimal.NewFromFloat(precio),
			"description":     desc,
			"unit":            unit,
			"tax_rate":        decimal.NewFromFloat(taxRate),
			"track_inventory": parseBool(getCol(row, colMap["controlar_inventario"]), true),
			"available":       parseBool(getCol(row, colMap["disponible"]), true),
		}
		if costo > 0 {
			dataMap["cost_price"] = decimal.NewFromFloat(costo)
		}
		if stockMin > 0 {
			dataMap["min_stock"] = decimal.NewFromFloat(stockMin)
		}

		if prod.ID != "" {
			if err := s.db.WithContext(ctx).Model(&prod).Updates(dataMap).Error; err != nil {
				rep.Errors = append(rep.Errors, map[string]any{"row": rowNum, "error": err.Error()})
				continue
			}
			rep.Updated++
		} else {
			dataMap["tenant_id"] = tenantID
			created := domain.Product{}
			if err := s.db.WithContext(ctx).Model(&created).Create(dataMap).Error; err != nil {
				rep.Errors = append(rep.Errors, map[string]any{"row": rowNum, "error": err.Error()})
				continue
			}
			prod = created
			rep.Created++
		}

		// Stock inicial
		if stockIni > 0 && branchID != "" {
			mov := domain.InventoryMovement{
				TenantID:      tenantID,
				BranchID:      branchID,
				ProductID:     prod.ID,
				MovementType:  domain.MovInAdjustment,
				Quantity:      decimal.NewFromFloat(stockIni),
				ReferenceType: "import",
				Notes:         "Stock inicial por importación Excel",
				CreatedBy:     userID,
			}
			s.db.WithContext(ctx).Create(&mov)
			s.db.WithContext(ctx).Exec(`
				INSERT INTO stock_items (tenant_id, branch_id, product_id, quantity)
				VALUES (?, ?, ?, ?)
				ON CONFLICT (branch_id, product_id) DO UPDATE SET quantity = stock_items.quantity + EXCLUDED.quantity
			`, tenantID, branchID, prod.ID, stockIni)
		}
	}

	return rep, nil
}

// GenerateTemplate devuelve un buffer Excel con cabeceras y ejemplos.
func (s *ImportService) GenerateTemplate() ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()
	sheet := "Productos"
	idx, _ := f.NewSheet(sheet)
	f.SetActiveSheet(idx)
	f.DeleteSheet("Sheet1")

	headers := []string{"categoria", "nombre", "precio", "costo", "sku", "codigo_barras", "unidad", "stock_inicial", "stock_minimo", "controlar_inventario", "disponible", "descripcion", "iva_porcentaje"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	examples := [][]any{
		{"cocteles", "Mojito clásico", 18000, 6000, "MOJ-001", "", "UNIT", 0, 5, "si", "si", "Mojito con hierbabuena", 19},
		{"whisky", "Glenfiddich 12", 35000, 18000, "WHI-GLE-12", "", "SHOT", 20, 3, "si", "si", "", 19},
		{"cervezas", "Corona", 9000, 3500, "CER-COR", "", "BOTTLE", 50, 12, "si", "si", "", 19},
	}
	for r, row := range examples {
		for c, v := range row {
			cell, _ := excelize.CoordinatesToCellName(c+1, r+2)
			f.SetCellValue(sheet, cell, v)
		}
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ─── helpers ──────────────────────────────────────────────────

func normalizeRow(row []string) []string {
	out := make([]string, len(row))
	for i, v := range row {
		out[i] = strings.ToLower(strings.TrimSpace(v))
	}
	return out
}
func getCol(row []string, idx int) string {
	if idx < 0 || idx >= len(row) {
		return ""
	}
	return row[idx]
}
func parseFloat(s string) float64 {
	if s == "" {
		return 0
	}
	s = strings.ReplaceAll(s, ",", ".")
	v, _ := strconv.ParseFloat(s, 64)
	return v
}
func parseBool(s string, def bool) bool {
	if s == "" {
		return def
	}
	s = strings.ToLower(strings.TrimSpace(s))
	return s == "si" || s == "sí" || s == "true" || s == "1" || s == "yes"
}
func capitalize(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

// ─── HTTP ─────────────────────────────────────────────────────

type ImportHandlers struct{ svc *ImportService }

func NewImportHandlers(svc *ImportService) *ImportHandlers { return &ImportHandlers{svc: svc} }

func (h *ImportHandlers) Register(r fiber.Router) {
	r.Post("/products", middleware.RequireRoles("ADMIN", "MANAGER"), h.importProducts)
	r.Get("/template", h.template)
}

func (h *ImportHandlers) importProducts(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	file, err := c.FormFile("file")
	if err != nil {
		return httpx.BadRequest(c, "Archivo requerido (campo 'file')")
	}
	src, err := file.Open()
	if err != nil {
		return httpx.FromError(c, err)
	}
	defer src.Close()
	buf := new(bytes.Buffer)
	if _, err := buf.ReadFrom(src); err != nil {
		return httpx.FromError(c, err)
	}
	rep, err := h.svc.ImportProducts(c.Context(), u.TenantID, u.Subject, buf.Bytes(), c.Query("branchId"))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.JSON(rep)
}

func (h *ImportHandlers) template(c *fiber.Ctx) error {
	buf, err := h.svc.GenerateTemplate()
	if err != nil {
		return httpx.FromError(c, err)
	}
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", "attachment; filename=plantilla-productos-admiral.xlsx")
	return c.Send(buf)
}
