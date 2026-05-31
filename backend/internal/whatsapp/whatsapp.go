// Package whatsapp — campañas y webhook seguro de WhatsApp Business API.
//
// 📚 Seguridad importante:
//   - El webhook se verifica con HMAC-SHA256 firmado por Meta con
//     WHATSAPP_APP_SECRET. SIN esto cualquiera podría inyectar eventos.
package whatsapp

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/admiral/admiral-pro/internal/event"
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type Config struct {
	Enabled            bool
	PhoneNumberID      string
	AccessToken        string
	WebhookVerifyToken string
	AppSecret          string
	APIVersion         string
}

type Service struct {
	db  *gorm.DB
	bus *event.Bus
	cfg Config
}

func NewService(db *gorm.DB, bus *event.Bus, cfg Config) *Service {
	s := &Service{db: db, bus: bus, cfg: cfg}
	bus.On("sale.closed", s.onSaleClosed)
	return s
}

// ─── DTOs ─────────────────────────────────────────────────────

type CampaignInput struct {
	Name         string          `json:"name" validate:"required"`
	TemplateID   string          `json:"templateId,omitempty"`
	SegmentQuery json.RawMessage `json:"segmentQuery" validate:"required"`
	ScheduledAt  *time.Time      `json:"scheduledAt,omitempty"`
}

// CreateCampaign solo persiste; el envío masivo se hace con SendCampaign.
func (s *Service) CreateCampaign(ctx context.Context, tenantID string, in CampaignInput) (*domain.Campaign, error) {
	var seg domain.JSONB
	if err := json.Unmarshal(in.SegmentQuery, &seg); err != nil {
		return nil, fmt.Errorf("segmentQuery inválido: %w", err)
	}
	c := domain.Campaign{
		TenantID:     tenantID,
		Name:         in.Name,
		SegmentQuery: seg,
		Status:       domain.CampaignDraft,
		ScheduledAt:  in.ScheduledAt,
	}
	if in.TemplateID != "" {
		c.TemplateID = &in.TemplateID
	}
	if in.ScheduledAt != nil {
		c.Status = domain.CampaignScheduled
	}
	err := s.db.WithContext(ctx).Create(&c).Error
	return &c, err
}

func (s *Service) ListCampaigns(ctx context.Context, tenantID string) ([]domain.Campaign, error) {
	var out []domain.Campaign
	err := s.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("created_at desc").Find(&out).Error
	return out, err
}

// SendTransactional envía un mensaje individual (resumen, agradecimiento).
// Si Enabled=false sólo loguea.
func (s *Service) SendTransactional(ctx context.Context, phone, templateName string, components any) error {
	if !s.cfg.Enabled {
		return nil
	}
	url := fmt.Sprintf("https://graph.facebook.com/%s/%s/messages", s.cfg.APIVersion, s.cfg.PhoneNumberID)
	payload := map[string]any{
		"messaging_product": "whatsapp",
		"to":                phone,
		"type":              "template",
		"template": map[string]any{
			"name":     templateName,
			"language": map[string]string{"code": "es"},
		},
	}
	if components != nil {
		payload["template"].(map[string]any)["components"] = components
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.cfg.AccessToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("whatsapp api: %s %s", resp.Status, string(b))
	}
	return nil
}

// VerifyWebhookSignature comprueba la firma HMAC-SHA256 con APP_SECRET.
// Esto evita que un atacante envíe eventos falsos.
func (s *Service) VerifyWebhookSignature(signature, body []byte) bool {
	if s.cfg.AppSecret == "" {
		// En dev podemos permitirlo, en producción debería ser obligatorio.
		return !s.cfg.Enabled
	}
	const prefix = "sha256="
	if len(signature) < len(prefix) || string(signature[:len(prefix)]) != prefix {
		return false
	}
	mac := hmac.New(sha256.New, []byte(s.cfg.AppSecret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), signature[len(prefix):])
}

// ProcessWebhook actualiza estados de mensajes y maneja STOP (opt-out).
func (s *Service) ProcessWebhook(ctx context.Context, body []byte) error {
	var payload struct {
		Entry []struct {
			Changes []struct {
				Value struct {
					Statuses []struct {
						ID     string `json:"id"`
						Status string `json:"status"`
					} `json:"statuses"`
					Messages []struct {
						From string `json:"from"`
						Text struct {
							Body string `json:"body"`
						} `json:"text"`
					} `json:"messages"`
				} `json:"value"`
			} `json:"changes"`
		} `json:"entry"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return err
	}

	for _, e := range payload.Entry {
		for _, ch := range e.Changes {
			for _, st := range ch.Value.Statuses {
				statusMap := map[string]domain.MessageStatus{
					"sent": domain.MsgSent, "delivered": domain.MsgDelivered,
					"read": domain.MsgRead, "failed": domain.MsgFailed,
				}
				if v, ok := statusMap[st.Status]; ok {
					_ = s.db.WithContext(ctx).Model(&domain.MessageLog{}).
						Where("wa_message_id = ?", st.ID).Update("status", v).Error
				}
			}
			for _, m := range ch.Value.Messages {
				if m.Text.Body == "" {
					continue
				}
				txt := m.Text.Body
				if txt == "STOP" || txt == "stop" || txt == "BAJA" {
					_ = s.optOutByPhone(ctx, "+"+m.From)
				}
			}
		}
	}
	return nil
}

func (s *Service) optOutByPhone(ctx context.Context, phone string) error {
	var cust domain.Customer
	if err := s.db.WithContext(ctx).First(&cust, "phone = ?", phone).Error; err != nil {
		return nil
	}
	now := time.Now()
	return s.db.WithContext(ctx).Model(&domain.WhatsAppConsent{}).
		Where("customer_id = ? AND active = true", cust.ID).
		Updates(map[string]any{"active": false, "revoked_at": &now}).Error
}

// onSaleClosed: enviar resumen transaccional si el cliente dio consent.
func (s *Service) onSaleClosed(payload any) {
	data, ok := payload.(map[string]any)
	if !ok {
		return
	}
	sale, _ := data["sale"].(*domain.Sale)
	if sale == nil || sale.CustomerID == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var cust domain.Customer
	if err := s.db.WithContext(ctx).First(&cust, "id = ?", *sale.CustomerID).Error; err != nil {
		return
	}
	var count int64
	s.db.WithContext(ctx).Model(&domain.WhatsAppConsent{}).
		Where("customer_id = ? AND type = 'transactional' AND active = true", cust.ID).Count(&count)
	if count == 0 {
		return
	}
	_ = s.SendTransactional(ctx, cust.Phone, "sale_summary", nil)
}

// ─── HTTP ─────────────────────────────────────────────────────

type Handlers struct{ svc *Service }

func NewHandlers(svc *Service) *Handlers { return &Handlers{svc: svc} }

func (h *Handlers) RegisterPublic(r fiber.Router) {
	r.Get("/webhook", h.verifyWebhook)
	r.Post("/webhook", h.receiveWebhook)
}

func (h *Handlers) RegisterPrivate(r fiber.Router) {
	r.Get("/campaigns", h.listCampaigns)
	r.Post("/campaigns", middleware.RequireRoles("ADMIN", "MANAGER"), h.createCampaign)
}

// GET /webhook: verificación de suscripción (lo hace Meta una sola vez).
func (h *Handlers) verifyWebhook(c *fiber.Ctx) error {
	if c.Query("hub.verify_token") != h.svc.cfg.WebhookVerifyToken {
		return httpx.Forbidden(c, "Token inválido")
	}
	return c.SendString(c.Query("hub.challenge"))
}

// POST /webhook: eventos en tiempo real.
func (h *Handlers) receiveWebhook(c *fiber.Ctx) error {
	body := c.Body()
	sig := c.Get("X-Hub-Signature-256")
	if !h.svc.VerifyWebhookSignature([]byte(sig), body) {
		return httpx.Forbidden(c, "Firma inválida")
	}
	if err := h.svc.ProcessWebhook(c.Context(), body); err != nil {
		return httpx.FromError(c, errors.New("webhook procesado parcialmente"))
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handlers) listCampaigns(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	out, err := h.svc.ListCampaigns(c.Context(), u.TenantID)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.JSON(out)
}

func (h *Handlers) createCampaign(c *fiber.Ctx) error {
	u := middleware.CurrentUser(c)
	var dto CampaignInput
	if err := httpx.BindAndValidate(c, &dto); err != nil {
		return err
	}
	out, err := h.svc.CreateCampaign(c.Context(), u.TenantID, dto)
	if err != nil {
		return httpx.FromError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(out)
}
