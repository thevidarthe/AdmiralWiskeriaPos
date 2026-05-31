package pos

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/dop251/goja"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// EvaluateRules busca y evalúa las reglas activas de IFTTT asociadas a un disparador específico
func (s *Service) EvaluateRules(ctx context.Context, tenantID, triggerType string, eventData map[string]any) error {
	var rules []domain.Rule
	err := s.db.WithContext(ctx).
		Preload("Actions").
		Where("tenant_id = ? AND trigger_type = ? AND active = true", tenantID, triggerType).
		Find(&rules).Error
	if err != nil {
		return err
	}

	if len(rules) == 0 {
		slog.Debug("No se encontraron reglas activas para el disparador", "trigger", triggerType)
		return nil
	}

	// Instanciar un runtime de Goja JS
	vm := goja.New()
	vm.Set("event", eventData)

	for _, rule := range rules {
		slog.Info("Evaluando regla IFTTT", "rule", rule.Name, "id", rule.ID)
		
		// Configurar un límite de tiempo de 100ms para evitar bloqueos por bucles infinitos en JS
		timer := time.AfterFunc(100*time.Millisecond, func() {
			vm.Interrupt("Script execution timeout")
		})
		
		// Evaluar condición JS
		res, err := vm.RunString(rule.ConditionJS)
		timer.Stop() // Detener el temporizador de inmediato

		if err != nil {
			slog.Error("Error compilando/ejecutando script de condición", "rule", rule.Name, "err", err)
			continue
		}

		if res.ToBoolean() {
			slog.Info("🎯 Condición CUMPLIDA. Ejecutando acciones", "rule", rule.Name)
			for _, action := range rule.Actions {
				if err := s.executeRuleAction(ctx, tenantID, action, eventData); err != nil {
					slog.Error("Fallo en ejecución de acción", "action", action.Type, "err", err)
				}
			}
		} else {
			slog.Debug("Condición NO cumplida", "rule", rule.Name)
		}
	}
	return nil
}

func (s *Service) executeRuleAction(ctx context.Context, tenantID string, action domain.RuleAction, eventData map[string]any) error {
	switch action.Type {
	case "whatsapp.webhook":
		// Payload contiene webhook de n8n o endpoint externo
		var payload struct {
			WebhookURL string `json:"webhookUrl"`
			Message    string `json:"message"`
		}
		
		dataBytes, _ := json.Marshal(action.Payload)
		if err := json.Unmarshal(dataBytes, &payload); err != nil {
			return err
		}

		if payload.WebhookURL == "" {
			// Webhook de n8n por defecto (nombre de host docker 'n8n' en puerto 5678)
			payload.WebhookURL = "http://n8n:5678/webhook/weather-promo"
		}

		// Combinar datos del evento y payload
		bodyData := map[string]any{
			"tenantId":  tenantID,
			"event":     eventData,
			"message":   payload.Message,
			"timestamp": time.Now().Format(time.RFC3339),
		}
		
		bodyBytes, _ := json.Marshal(bodyData)
		req, err := http.NewRequestWithContext(ctx, "POST", payload.WebhookURL, bytes.NewBuffer(bodyBytes))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("error llamando webhook n8n: %w", err)
		}
		defer resp.Body.Close()
		
		slog.Info("Webhook de n8n disparado con éxito", "status", resp.Status)
		return nil

	case "pos.apply_promo":
		// Modifica las tarifas de licores en caliente en la base de datos!
		// ej: {"skus": ["COC-HER-LUL", "COC-HER-MOR"], "promoPrice": 12500.00, "originalPrice": 25000.00}
		var payload struct {
			SKUs          []string `json:"skus"`
			PromoPrice    float64  `json:"promoPrice"`
			OriginalPrice float64  `json:"originalPrice"`
			Active        bool     `json:"active"`
		}
		
		dataBytes, _ := json.Marshal(action.Payload)
		if err := json.Unmarshal(dataBytes, &payload); err != nil {
			return err
		}

		targetPrice := payload.OriginalPrice
		if payload.Active {
			targetPrice = payload.PromoPrice
		}

		err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			// Actualizar basePrice de los SKUs indicados
			for _, sku := range payload.SKUs {
				res := tx.Model(&domain.Product{}).
					Where("tenant_id = ? AND sku = ?", tenantID, sku).
					Update("base_price", decimal.NewFromFloat(targetPrice))
				if res.Error != nil {
					return res.Error
				}
				slog.Info("Precio de licor ajustado en caliente por IFTTT", "sku", sku, "newPrice", targetPrice)
			}
			return nil
		})
		return err

	default:
		return fmt.Errorf("tipo de acción no soportado: %s", action.Type)
	}
}
