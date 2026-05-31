package pos

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

var (
	ErrSplitAlreadyExists = errors.New("esta orden ya tiene una cuenta dividida activa")
	ErrSplitNotFound      = errors.New("no se encontró una división activa para esta orden")
	ErrShareNotFound      = errors.New("no se encontró la cuota indicada")
	ErrShareAlreadyPaid   = errors.New("esta cuota ya ha sido pagada")
	ErrInvalidShareAmount = errors.New("la suma de las cuotas no coincide con el total de la orden")
)

type SplitShareInput struct {
	Name   string  `json:"name" validate:"required"`
	Phone  string  `json:"phone" validate:"required"`
	Amount float64 `json:"amount" validate:"required,gt=0"`
}

type InitiateSplitInput struct {
	Shares []SplitShareInput `json:"shares" validate:"required,min=2,dive"`
}

type PayShareInput struct {
	Method    domain.PaymentMethod `json:"method" validate:"required"`
	Reference string               `json:"reference,omitempty"`
}

// InitiateSplit crea una nueva división de cuenta para una orden abierta
func (s *Service) InitiateSplit(ctx context.Context, tenantID, saleID string, in InitiateSplitInput) (*domain.SaleSplit, error) {
	sale, err := s.GetSale(ctx, tenantID, saleID)
	if err != nil {
		return nil, err
	}
	if sale.Status != domain.SaleOpen {
		return nil, ErrSaleNotOpen
	}

	// Verificar si ya existe un split
	var existing domain.SaleSplit
	err = s.db.WithContext(ctx).Where("tenant_id = ? AND sale_id = ?", tenantID, saleID).First(&existing).Error
	if err == nil {
		return nil, ErrSplitAlreadyExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Validar que la suma de cuotas coincida con el total de la orden
	totalInput := decimal.Zero
	for _, sh := range in.Shares {
		totalInput = totalInput.Add(decimal.NewFromFloat(sh.Amount))
	}
	// Tolerancia de redondeo $5 COP
	if totalInput.Sub(sale.GrandTotal).Abs().GreaterThan(decimal.NewFromInt(5)) {
		return nil, fmt.Errorf("%w: cuotas=%s, total=%s", ErrInvalidShareAmount, totalInput, sale.GrandTotal)
	}

	split := domain.SaleSplit{
		TenantID:    tenantID,
		SaleID:      saleID,
		TotalShares: len(in.Shares),
		Status:      "PENDING",
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&split).Error; err != nil {
			return err
		}

		for _, sh := range in.Shares {
			share := domain.SaleShare{
				SaleSplitID: split.ID,
				Name:        sh.Name,
				Phone:       sh.Phone,
				ShareAmount: decimal.NewFromFloat(sh.Amount),
				Status:      "PENDING",
			}
			if err := tx.Create(&share).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	// Cargar completo
	var out domain.SaleSplit
	_ = s.db.WithContext(ctx).Preload("Shares").First(&out, "id = ?", split.ID).Error
	return &out, nil
}

// GetSplit obtiene la división de cuenta de una venta
func (s *Service) GetSplit(ctx context.Context, tenantID, saleID string) (*domain.SaleSplit, error) {
	var split domain.SaleSplit
	err := s.db.WithContext(ctx).
		Preload("Shares").
		Where("tenant_id = ? AND sale_id = ?", tenantID, saleID).
		First(&split).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSplitNotFound
		}
		return nil, err
	}
	return &split, nil
}

// PayShare procesa el pago de una participación individual e inscribe al cliente en el CRM
func (s *Service) PayShare(ctx context.Context, tenantID, shareID string, in PayShareInput) (*domain.SaleShare, error) {
	var share domain.SaleShare
	if err := s.db.WithContext(ctx).First(&share, "id = ?", shareID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrShareNotFound
		}
		return nil, err
	}
	if share.Status == "PAID" {
		return nil, ErrShareAlreadyPaid
	}

	// Cargar Split y Venta para obtener el contexto de negocio
	var split domain.SaleSplit
	if err := s.db.WithContext(ctx).First(&split, "id = ?", share.SaleSplitID).Error; err != nil {
		return nil, err
	}
	sale, err := s.GetSale(ctx, tenantID, split.SaleID)
	if err != nil {
		return nil, err
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Sincronizar o crear comensal en el CRM (Cero Fricción - Growth Loop)
		var customer domain.Customer
		err := tx.Where("tenant_id = ? AND phone = ?", tenantID, share.Phone).First(&customer).Error
		pointsGained := int(share.ShareAmount.Div(decimal.NewFromInt(100)).IntPart()) // 1 pt por cada $100 COP

		if err == nil {
			// Actualizar cliente existente
			customer.Name = share.Name // Sincroniza el nombre más reciente
			customer.PointsBalance += pointsGained
			customer.TotalSpent = customer.TotalSpent.Add(share.ShareAmount)
			customer.VisitCount += 1
			now := time.Now()
			customer.LastVisitAt = &now
			if err := tx.Save(&customer).Error; err != nil {
				return err
			}
		} else if errors.Is(err, gorm.ErrRecordNotFound) {
			// Crear nuevo comensal VIP
			customer = domain.Customer{
				TenantID:      tenantID,
				Name:          share.Name,
				Phone:         share.Phone,
				LoyaltyLevel:  domain.LoyaltyClassic,
				PointsBalance: pointsGained,
				TotalSpent:    share.ShareAmount,
				VisitCount:    1,
			}
			now := time.Now()
			customer.LastVisitAt = &now
			if err := tx.Create(&customer).Error; err != nil {
				return err
			}
		} else {
			return err
		}

		// Registrar Transacción de Puntos
		lt := domain.LoyaltyTransaction{
			CustomerID:  customer.ID,
			SaleID:      &sale.ID,
			PointsDelta: pointsGained,
			Reason:      fmt.Sprintf("Pago de cuota dividida en Mesa %s", getTableNumber(sale)),
		}
		if err := tx.Create(&lt).Error; err != nil {
			return err
		}

		// 2. Crear Registro de Pago (Payment) para cuadre de caja
		ref := in.Reference
		if ref == "" {
			ref = fmt.Sprintf("Cuota de %s", share.Name)
		}
		payment := domain.Payment{
			TenantID:  tenantID,
			SaleID:    sale.ID,
			Method:    in.Method,
			Amount:    share.ShareAmount,
			Status:    domain.PaymentCompleted,
			Reference: ref,
		}
		if err := tx.Create(&payment).Error; err != nil {
			return err
		}

		// 3. Actualizar estado de la cuota (Share)
		share.Status = "PAID"
		share.CustomerID = &customer.ID
		share.PaymentID = &payment.ID
		if err := tx.Save(&share).Error; err != nil {
			return err
		}

		// 4. Verificar si todas las cuotas están cubiertas
		var pendingShares int64
		if err := tx.Model(&domain.SaleShare{}).Where("sale_split_id = ? AND status = 'PENDING'", split.ID).Count(&pendingShares).Error; err != nil {
			return err
		}

		if pendingShares == 0 {
			// Todas las cuotas pagadas! Cerrar venta general
			split.Status = "COMPLETED"
			if err := tx.Save(&split).Error; err != nil {
				return err
			}

			// Calcular totales sumados
			totalTips := decimal.Zero // Tip o cargos adicionales podrían manejarse
			now := time.Now()

			if err := tx.Model(&domain.Sale{}).
				Where("id = ?", sale.ID).
				Updates(map[string]any{
					"status":      domain.SalePaid,
					"tip_amount":  totalTips,
					"closed_at":   &now,
				}).Error; err != nil {
				return err
			}

			// Liberar Mesa
			if sale.TableID != nil {
				if err := tx.Model(&domain.Table{}).
					Where("id = ?", *sale.TableID).
					Update("status", domain.TableFree).Error; err != nil {
					return err
				}
			}

			// Descontar Stock e Inventario
			for _, item := range sale.Items {
				res := tx.Model(&domain.StockItem{}).
					Where("branch_id = ? AND product_id = ?", sale.BranchID, item.ProductID).
					Update("quantity", gorm.Expr("quantity - ?", item.Quantity))
				if res.Error != nil {
					return res.Error
				}
				mov := domain.InventoryMovement{
					TenantID:      tenantID,
					BranchID:      sale.BranchID,
					ProductID:     item.ProductID,
					MovementType:  domain.MovOutSale,
					Quantity:      item.Quantity,
					ReferenceType: "sale",
					ReferenceID:   sale.ID,
					CreatedBy:     customer.ID, // Atribuido al cliente final
				}
				if err := tx.Create(&mov).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Retornar cuota actualizada
	_ = s.db.WithContext(ctx).First(&share, "id = ?", shareID).Error

	// Emitir evento si el split se completó
	var pending int64
	_ = s.db.WithContext(ctx).Model(&domain.SaleShare{}).Where("sale_split_id = ? AND status = 'PENDING'", split.ID).Count(&pending)
	if pending == 0 {
		final, _ := s.GetSale(ctx, tenantID, sale.ID)
		totalF, _ := sale.GrandTotal.Float64()
		s.bus.Emit("sale.closed", map[string]any{
			"tenantId":   tenantID,
			"sale":       final,
			"amount":     totalF,
			"customerId": share.CustomerID,
			"userId":     "system_split",
		})
	}

	return &share, nil
}

func getTableNumber(sale *domain.Sale) string {
	if sale.Table != nil {
		return sale.Table.Number
	}
	return "S/N"
}
