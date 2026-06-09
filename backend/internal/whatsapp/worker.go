package whatsapp

import (
	"context"
	"fmt"
	"log/slog"
	"time"
)

func (s *Service) RunWorker(ctx context.Context, pollInterval time.Duration) {
	slog.Info("WhatsApp outbox worker started", "interval", pollInterval)
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			slog.Info("WhatsApp outbox worker stopped")
			return
		case <-ticker.C:
			s.processOutboxBatch(ctx)
		}
	}
}

func (s *Service) processOutboxBatch(ctx context.Context) {
	msgs, err := s.FetchPendingOutbox(ctx, 10)
	if err != nil {
		slog.Error("outbox: fetch failed", "err", err)
		return
	}

	for _, msg := range msgs {
		s.processOutboxMessage(ctx, &msg)
	}
}

func (s *Service) processOutboxMessage(ctx context.Context, msg *OutboxMessage) {
	if err := s.MarkOutboxSending(ctx, msg.ID); err != nil {
		slog.Error("outbox: mark sending failed", "id", msg.ID, "err", err)
		return
	}

	var sendErr error
	if msg.TemplateName != nil && *msg.TemplateName != "" {
		sendErr = s.SendTransactional(ctx, msg.Phone, *msg.TemplateName, msg.Payload)
	} else if msg.Body != nil {
		sendErr = s.sendTextMessage(ctx, msg.Phone, *msg.Body)
	} else {
		sendErr = fmt.Errorf("no template or body specified")
	}

	if sendErr != nil {
		slog.Warn("outbox: send failed, scheduling retry",
			"id", msg.ID,
			"attempt", msg.Attempts+1,
			"err", sendErr,
		)
		if err := s.MarkOutboxFailed(ctx, msg.ID, sendErr.Error()); err != nil {
			slog.Error("outbox: mark failed error", "id", msg.ID, "err", err)
		}
		return
	}

	if err := s.MarkOutboxSent(ctx, msg.ID, ""); err != nil {
		slog.Error("outbox: mark sent failed", "id", msg.ID, "err", err)
	}
}

func (s *Service) sendTextMessage(ctx context.Context, phone, text string) error {
	if !s.cfg.Enabled {
		slog.Info("WhatsApp disabled, skipping text message", "phone", phone, "text", text)
		return nil
	}

	payload := map[string]any{
		"messaging_product": "whatsapp",
		"to":                phone,
		"type":              "text",
		"text":              map[string]string{"body": text},
	}

	_, err := s.callMetaAPI(ctx, payload)
	return err
}
