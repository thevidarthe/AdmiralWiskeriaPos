package whatsapp

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/admiral/admiral-pro/internal/domain"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"gorm.io/gorm"
)

func (s *Service) HandleInboundMessage(ctx context.Context, tenantID, conversationID, phone, body string) error {
	conv, err := s.getConversation(ctx, conversationID)
	if err != nil {
		return err
	}
	if !conv.BotEnabled {
		return nil
	}

	session, err := s.getOrCreateSession(ctx, tenantID, conversationID)
	if err != nil {
		return err
	}

	if session.ExpiresAt.Before(time.Now()) {
		session.CurrentState = BotStateWelcome
		session.Context = domain.JSONB{}
		_ = s.db.WithContext(ctx).Model(session).Updates(map[string]any{
			"current_state": session.CurrentState,
			"context":       session.Context,
			"expires_at":    time.Now().Add(30 * time.Minute),
		}).Error
	}

	upper := strings.ToUpper(strings.TrimSpace(body))

	switch {
	case upper == "HUMAN" || upper == "ASESOR" || upper == "MESERO":
		return s.handleHandoff(ctx, conv, session, upper)
	case upper == "CANCELAR" || upper == "SALIR":
		return s.handleCancel(ctx, conv, session)
	case upper == "HOLA" || upper == "MENU" || upper == "MENÚ":
		return s.handleMenu(ctx, conv, session)
	case upper == "PEDIDO" || upper == "ORDEN":
		return s.handleStartOrder(ctx, conv, session)
	case upper == "PROMOCIONES" || upper == "PROMOS":
		return s.handlePromotions(ctx, conv, session)
	case session.CurrentState == BotStateBuildingOrder:
		return s.handleOrderInput(ctx, conv, session, body)
	case session.CurrentState == BotStateWaitingConfirmation:
		return s.handleConfirmation(ctx, conv, session, upper)
	default:
		return s.handleMenu(ctx, conv, session)
	}
}

func (s *Service) handleMenu(ctx context.Context, conv *Conversation, session *BotSession) error {
	text := `🥃 *Admiral Whiskería*

Bienvenido. ¿Qué deseas hacer?

1️⃣ *Menú* — Ver nuestra carta
2️⃣ *Pedido* — Hacer un pedido
3️⃣ *Promociones* — Ofertas activas
4️⃣ *Mesero* — Llamar al mesero
5️⃣ *Asesor* — Hablar con un humano

Escribe el número o la palabra.`

	s.updateState(ctx, session, BotStateShowingMenu)
	return s.replyText(ctx, conv.Phone, text)
}

func (s *Service) handleStartOrder(ctx context.Context, conv *Conversation, session *BotSession) error {
	text := `📝 *Nuevo Pedido*

Escribe los productos que deseas, uno por línea.
Ejemplo:
- 2 Whisky Old Fashioned
- 1 Tabla de quesos

Cuando termines, escribe *LISTO* para confirmar.`

	s.updateState(ctx, session, BotStateBuildingOrder)
	session.Context["order_items"] = []string{}
	_ = s.saveSession(ctx, session)
	return s.replyText(ctx, conv.Phone, text)
}

func (s *Service) handleOrderInput(ctx context.Context, conv *Conversation, session *BotSession, body string) error {
	upper := strings.ToUpper(strings.TrimSpace(body))
	if upper == "LISTO" || upper == "CONFIRMAR" {
		return s.handleConfirmation(ctx, conv, session, "CONFIRMAR")
	}

	items, _ := session.Context["order_items"].([]interface{})
	items = append(items, body)
	session.Context["order_items"] = items
	_ = s.saveSession(ctx, session)

	text := fmt.Sprintf("✅ Agregado: %s\n\nEscribe otro producto o *LISTO* para confirmar.", body)
	return s.replyText(ctx, conv.Phone, text)
}

func (s *Service) handleConfirmation(ctx context.Context, conv *Conversation, session *BotSession, upper string) error {
	if upper == "SI" || upper == "SÍ" || upper == "CONFIRMAR" || upper == "1" {
		items, _ := session.Context["order_items"].([]interface{})
		text := fmt.Sprintf("🎉 *Pedido confirmado*\n\n%d productos recibidos.\nTu mesero lo atenderá pronto.\n\nEscribe *MENÚ* para volver al inicio.", len(items))
		s.updateState(ctx, session, BotStateWelcome)

		s.bus.Emit("order.created", map[string]any{
			"tenantId":       conv.TenantID,
			"conversationId": conv.ID,
			"phone":          conv.Phone,
			"items":          items,
			"source":         "WHATSAPP",
		})

		return s.replyText(ctx, conv.Phone, text)
	}

	text := "❌ Pedido cancelado. Escribe *MENÚ* para volver al inicio."
	s.updateState(ctx, session, BotStateWelcome)
	return s.replyText(ctx, conv.Phone, text)
}

func (s *Service) handlePromotions(ctx context.Context, conv *Conversation, session *BotSession) error {
	text := `🎉 *Promociones Activas*

• Happy Hour: 2x1 en cocteles, lun-vie 6-8 PM
• Botella de whisky + 2 refrescos: $180,000 COP

Visítanos o escribe *PEDIDO* para ordenar.`

	return s.replyText(ctx, conv.Phone, text)
}

func (s *Service) handleHandoff(ctx context.Context, conv *Conversation, session *BotSession, keyword string) error {
	_ = s.db.WithContext(ctx).Model(conv).Update("bot_enabled", false).Error
	s.updateState(ctx, session, BotStateHandoffHuman)

	if keyword == "MESERO" {
		s.bus.Emit("qr.waiterCalled", map[string]any{
			"tenantId":       conv.TenantID,
			"conversationId": conv.ID,
			"phone":          conv.Phone,
		})
	}

	text := "👤 Un asesor humano te atenderá pronto. Escribe *MENÚ* para volver al bot."
	return s.replyText(ctx, conv.Phone, text)
}

func (s *Service) handleCancel(ctx context.Context, conv *Conversation, session *BotSession) error {
	s.updateState(ctx, session, BotStateWelcome)
	return s.replyText(ctx, conv.Phone, "Operación cancelada. Escribe *HOLA* para comenzar.")
}

func (s *Service) replyText(ctx context.Context, phone, text string) error {
	body := text
	_, err := s.EnqueueOutbox(ctx, s.cfg.DefaultTenantID, phone, "text", "", &body, domain.JSONB{})
	return err
}

func (s *Service) getConversation(ctx context.Context, id string) (*Conversation, error) {
	var conv Conversation
	if err := s.db.WithContext(ctx).First(&conv, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &conv, nil
}

func (s *Service) getOrCreateSession(ctx context.Context, tenantID, conversationID string) (*BotSession, error) {
	var session BotSession
	err := s.db.WithContext(ctx).
		Where("conversation_id = ?", conversationID).
		First(&session).Error
	if err == nil {
		return &session, nil
	}
	if err != gorm.ErrRecordNotFound {
		return nil, err
	}

	session = BotSession{
		ID:             domain.NewID(),
		TenantID:       tenantID,
		ConversationID: conversationID,
		CurrentState:   BotStateWelcome,
		Context:        domain.JSONB{},
		ExpiresAt:      time.Now().Add(30 * time.Minute),
	}
	if err := s.db.WithContext(ctx).Create(&session).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

func (s *Service) updateState(ctx context.Context, session *BotSession, state string) {
	session.CurrentState = state
	_ = s.db.WithContext(ctx).Model(session).Update("current_state", state).Error
}

func (s *Service) saveSession(ctx context.Context, session *BotSession) error {
	return s.db.WithContext(ctx).Model(session).
		Updates(map[string]any{"context": session.Context, "current_state": session.CurrentState}).Error
}

func (s *Service) ListConversations(ctx context.Context, tenantID string, pg httpx.Pagination) (*httpx.PaginatedResult[Conversation], error) {
	var total int64
	if err := s.db.WithContext(ctx).Model(&Conversation{}).Where("tenant_id = ?", tenantID).Count(&total).Error; err != nil {
		return nil, err
	}
	var convs []Conversation
	err := s.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Order("last_message_at DESC NULLS LAST, created_at DESC").
		Offset(pg.Offset()).
		Limit(pg.PageSize).
		Find(&convs).Error
	if err != nil {
		return nil, err
	}
	result := httpx.NewPaginatedResult(convs, int(total), pg)
	return &result, nil
}

func (s *Service) GetConversationMessages(ctx context.Context, conversationID string) ([]Message, error) {
	var msgs []Message
	err := s.db.WithContext(ctx).
		Where("conversation_id = ?", conversationID).
		Order("created_at ASC").
		Limit(100).
		Find(&msgs).Error
	return msgs, err
}

func (s *Service) ToggleBot(ctx context.Context, conversationID string, enabled bool) error {
	return s.db.WithContext(ctx).Model(&Conversation{}).
		Where("id = ?", conversationID).
		Update("bot_enabled", enabled).Error
}

func (s *Service) CloseConversation(ctx context.Context, conversationID string) error {
	return s.db.WithContext(ctx).Model(&Conversation{}).
		Where("id = ?", conversationID).
		Update("status", ConvStatusClosed).Error
}

func init() {
	_ = slog.Default()
}
