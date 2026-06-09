package whatsapp

import (
	"context"
	"time"

	"github.com/admiral/admiral-pro/internal/domain"
	"gorm.io/gorm"
)

func (s *Service) EnqueueOutbox(ctx context.Context, tenantID, phone, messageType, templateName string, body *string, payload domain.JSONB) (*OutboxMessage, error) {
	msg := &OutboxMessage{
		ID:            domain.NewID(),
		TenantID:      tenantID,
		Phone:         phone,
		MessageType:   messageType,
		Payload:       payload,
		Status:        OutboxStatusQueued,
		NextAttemptAt: time.Now(),
	}
	if templateName != "" {
		msg.TemplateName = &templateName
	}
	if body != nil {
		msg.Body = body
	}
	if err := s.db.WithContext(ctx).Create(msg).Error; err != nil {
		return nil, err
	}
	return msg, nil
}

func (s *Service) FetchPendingOutbox(ctx context.Context, limit int) ([]OutboxMessage, error) {
	var msgs []OutboxMessage
	err := s.db.WithContext(ctx).
		Where("status IN ? AND next_attempt_at <= ?", []string{OutboxStatusQueued, OutboxStatusRetrying}, time.Now()).
		Order("next_attempt_at ASC").
		Limit(limit).
		Find(&msgs).Error
	return msgs, err
}

func (s *Service) MarkOutboxSending(ctx context.Context, id string) error {
	return s.db.WithContext(ctx).Model(&OutboxMessage{}).
		Where("id = ?", id).
		Updates(map[string]any{"status": OutboxStatusSending}).Error
}

func (s *Service) MarkOutboxSent(ctx context.Context, id, waMessageID string) error {
	now := time.Now()
	return s.db.WithContext(ctx).Model(&OutboxMessage{}).
		Where("id = ?", id).
		Updates(map[string]any{"status": OutboxStatusSent, "sent_at": &now}).Error
}

func (s *Service) MarkOutboxFailed(ctx context.Context, id string, errMsg string) error {
	var msg OutboxMessage
	if err := s.db.WithContext(ctx).First(&msg, "id = ?", id).Error; err != nil {
		return err
	}

	nextAttempt := msg.Attempts + 1
	newStatus := OutboxStatusRetrying
	var nextAt time.Time

	if nextAttempt >= len(backoffSchedule) {
		newStatus = OutboxStatusDead
		nextAt = time.Now()
	} else {
		nextAt = time.Now().Add(backoffSchedule[nextAttempt])
	}

	return s.db.WithContext(ctx).Model(&msg).
		Updates(map[string]any{
			"status":          newStatus,
			"attempts":        nextAttempt,
			"next_attempt_at": nextAt,
			"last_error":      errMsg,
		}).Error
}

func (s *Service) GetOrCreateConversation(ctx context.Context, tenantID, phone string) (*Conversation, error) {
	var conv Conversation
	err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND phone = ?", tenantID, phone).
		First(&conv).Error
	if err == nil {
		return &conv, nil
	}
	if err != gorm.ErrRecordNotFound {
		return nil, err
	}

	conv = Conversation{
		ID:         domain.NewID(),
		TenantID:   tenantID,
		Phone:      phone,
		Status:     ConvStatusOpen,
		BotEnabled: true,
	}
	if err := s.db.WithContext(ctx).Create(&conv).Error; err != nil {
		return nil, err
	}
	return &conv, nil
}

func (s *Service) SaveInboundMessage(ctx context.Context, tenantID, conversationID, waMessageID, messageType string, body *string) (*Message, error) {
	if waMessageID != "" {
		var existing Message
		if err := s.db.WithContext(ctx).Where("wa_message_id = ?", waMessageID).First(&existing).Error; err == nil {
			return &existing, nil
		}
	}

	msg := &Message{
		ID:             domain.NewID(),
		TenantID:       tenantID,
		ConversationID: conversationID,
		Direction:      DirectionInbound,
		MessageType:    messageType,
		Body:           body,
		Status:         "RECEIVED",
	}
	if waMessageID != "" {
		msg.WAMessageID = &waMessageID
	}
	if err := s.db.WithContext(ctx).Create(msg).Error; err != nil {
		return nil, err
	}

	now := time.Now()
	_ = s.db.WithContext(ctx).Model(&Conversation{}).
		Where("id = ?", conversationID).
		Update("last_message_at", &now).Error

	return msg, nil
}

func (s *Service) UpdateMessageStatus(ctx context.Context, waMessageID, status string) error {
	return s.db.WithContext(ctx).Model(&Message{}).
		Where("wa_message_id = ?", waMessageID).
		Update("status", status).Error
}
