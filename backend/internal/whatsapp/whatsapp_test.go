package whatsapp

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestVerifyWebhookSignature_Valid(t *testing.T) {
	svc := &Service{cfg: Config{AppSecret: "test-secret-key-12345", Enabled: true}}
	body := []byte(`{"test":"payload"}`)
	mac := hmac.New(sha256.New, []byte("test-secret-key-12345"))
	mac.Write(body)
	sig := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	assert.True(t, svc.VerifyWebhookSignature([]byte(sig), body))
}

func TestVerifyWebhookSignature_Invalid(t *testing.T) {
	svc := &Service{cfg: Config{AppSecret: "test-secret-key-12345", Enabled: true}}
	body := []byte(`{"test":"payload"}`)
	assert.False(t, svc.VerifyWebhookSignature([]byte("sha256=invalid"), body))
}

func TestVerifyWebhookSignature_NoSecret_Disabled(t *testing.T) {
	svc := &Service{cfg: Config{AppSecret: "", Enabled: false}}
	assert.True(t, svc.VerifyWebhookSignature(nil, nil))
}

func TestVerifyWebhookSignature_NoSecret_Enabled(t *testing.T) {
	svc := &Service{cfg: Config{AppSecret: "", Enabled: true}}
	assert.False(t, svc.VerifyWebhookSignature(nil, nil))
}

func TestVerifyWebhookSignature_MissingPrefix(t *testing.T) {
	svc := &Service{cfg: Config{AppSecret: "test-secret", Enabled: true}}
	assert.False(t, svc.VerifyWebhookSignature([]byte("invalid"), []byte("body")))
}

func TestIsOptOutKeyword(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"STOP", true},
		{"BAJA", true},
		{"CANCELAR", true},
		{"NO QUIERO", true},
		{"SALIR", true},
		{"HOLA", false},
		{"MENU", false},
		{"", false},
		{"PARAR", false},
	}
	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			assert.Equal(t, tt.expected, isOptOutKeyword(tt.input))
		})
	}
}

func TestBackoffSchedule(t *testing.T) {
	assert.Equal(t, 5, len(backoffSchedule))
	assert.Equal(t, backoffSchedule[0].String(), "0s")
}
