package whatsapp

import (
	"time"

	"github.com/admiral/admiral-pro/internal/domain"
)

type Conversation struct {
	ID             string         `gorm:"column:id;primaryKey" json:"id"`
	TenantID       string         `gorm:"column:tenant_id;not null" json:"tenantId"`
	CustomerID     *string        `gorm:"column:customer_id" json:"customerId,omitempty"`
	Phone          string         `gorm:"column:phone;not null" json:"phone"`
	Status         string         `gorm:"column:status;not null;default:OPEN" json:"status"`
	AssignedUserID *string        `gorm:"column:assigned_user_id" json:"assignedUserId,omitempty"`
	BotEnabled     bool           `gorm:"column:bot_enabled;not null;default:true" json:"botEnabled"`
	LastMessageAt  *time.Time     `gorm:"column:last_message_at" json:"lastMessageAt,omitempty"`
	CreatedAt      time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt      time.Time      `gorm:"column:updated_at" json:"updatedAt"`
}

func (Conversation) TableName() string { return "whatsapp_conversations" }

type Message struct {
	ID             string        `gorm:"column:id;primaryKey" json:"id"`
	TenantID       string        `gorm:"column:tenant_id;not null" json:"tenantId"`
	ConversationID string        `gorm:"column:conversation_id;not null" json:"conversationId"`
	Direction      string        `gorm:"column:direction;not null" json:"direction"`
	WAMessageID    *string       `gorm:"column:wa_message_id" json:"waMessageId,omitempty"`
	MessageType    string        `gorm:"column:message_type;not null;default:text" json:"messageType"`
	Body           *string       `gorm:"column:body" json:"body,omitempty"`
	Payload        domain.JSONB  `gorm:"column:payload;type:jsonb;default:'{}'" json:"payload"`
	Status         string        `gorm:"column:status;not null;default:RECEIVED" json:"status"`
	Error          *string       `gorm:"column:error" json:"error,omitempty"`
	CreatedAt      time.Time     `gorm:"column:created_at" json:"createdAt"`
}

func (Message) TableName() string { return "whatsapp_messages" }

type OutboxMessage struct {
	ID             string        `gorm:"column:id;primaryKey" json:"id"`
	TenantID       string        `gorm:"column:tenant_id;not null" json:"tenantId"`
	ConversationID *string       `gorm:"column:conversation_id" json:"conversationId,omitempty"`
	Phone          string        `gorm:"column:phone;not null" json:"phone"`
	MessageType    string        `gorm:"column:message_type;not null;default:template" json:"messageType"`
	TemplateName   *string       `gorm:"column:template_name" json:"templateName,omitempty"`
	Body           *string       `gorm:"column:body" json:"body,omitempty"`
	Payload        domain.JSONB  `gorm:"column:payload;type:jsonb;default:'{}'" json:"payload"`
	Status         string        `gorm:"column:status;not null;default:QUEUED" json:"status"`
	Attempts       int           `gorm:"column:attempts;not null;default:0" json:"attempts"`
	NextAttemptAt  time.Time     `gorm:"column:next_attempt_at;not null" json:"nextAttemptAt"`
	LastError      *string       `gorm:"column:last_error" json:"lastError,omitempty"`
	CreatedAt      time.Time     `gorm:"column:created_at" json:"createdAt"`
	SentAt         *time.Time    `gorm:"column:sent_at" json:"sentAt,omitempty"`
}

func (OutboxMessage) TableName() string { return "whatsapp_outbox" }

type BotSession struct {
	ID             string        `gorm:"column:id;primaryKey" json:"id"`
	TenantID       string        `gorm:"column:tenant_id;not null" json:"tenantId"`
	ConversationID string        `gorm:"column:conversation_id;not null" json:"conversationId"`
	CurrentState   string        `gorm:"column:current_state;not null;default:WELCOME" json:"currentState"`
	Context        domain.JSONB  `gorm:"column:context;type:jsonb;default:'{}'" json:"context"`
	ExpiresAt      time.Time     `gorm:"column:expires_at;not null" json:"expiresAt"`
	CreatedAt      time.Time     `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt      time.Time     `gorm:"column:updated_at" json:"updatedAt"`
}

func (BotSession) TableName() string { return "whatsapp_bot_sessions" }

const (
	OutboxStatusQueued    = "QUEUED"
	OutboxStatusSending   = "SENDING"
	OutboxStatusSent      = "SENT"
	OutboxStatusDelivered = "DELIVERED"
	OutboxStatusRead      = "READ"
	OutboxStatusFailed    = "FAILED"
	OutboxStatusRetrying  = "RETRYING"
	OutboxStatusDead      = "DEAD"

	DirectionInbound  = "INBOUND"
	DirectionOutbound = "OUTBOUND"

	ConvStatusOpen   = "OPEN"
	ConvStatusClosed = "CLOSED"

	BotStateWelcome            = "WELCOME"
	BotStateShowingMenu        = "SHOWING_MENU"
	BotStateBuildingOrder      = "BUILDING_ORDER"
	BotStateWaitingTable       = "WAITING_TABLE"
	BotStateWaitingConfirmation = "WAITING_CONFIRMATION"
	BotStateHandoffHuman       = "HANDOFF_HUMAN"
)

var backoffSchedule = []time.Duration{
	0,
	30 * time.Second,
	2 * time.Minute,
	10 * time.Minute,
	30 * time.Minute,
}
