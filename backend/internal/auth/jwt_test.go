package auth

import (
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJWTService_SignAndVerify(t *testing.T) {
	svc, err := NewJWTService("test-secret-at-least-32-characters-long!", 1, "test")
	require.NoError(t, err)

	token, exp, err := svc.Sign("u1", "t1", "admiral", "ADMIN", "Juan", "juan@a.co")
	require.NoError(t, err)
	require.NotEmpty(t, token)
	require.True(t, exp.After(time.Now()))

	claims, err := svc.Verify(token)
	require.NoError(t, err)
	assert.Equal(t, "u1", claims.Subject)
	assert.Equal(t, "ADMIN", claims.Role)
	assert.Equal(t, "admiral", claims.TenantSlug)
}

func TestJWTService_RejectsShortSecret(t *testing.T) {
	_, err := NewJWTService("short", 1, "test")
	require.Error(t, err)
}

func TestJWTService_RejectsBadSignature(t *testing.T) {
	svc1, _ := NewJWTService("test-secret-aaaaaaaaaaaaaaaaaaaaaaaaa", 1, "test")
	svc2, _ := NewJWTService("test-secret-bbbbbbbbbbbbbbbbbbbbbbbbb", 1, "test")
	token, _, _ := svc1.Sign("u1", "t1", "admiral", "ADMIN", "n", "e")
	_, err := svc2.Verify(token)
	require.Error(t, err)
}

func TestJWTService_RejectsExpired(t *testing.T) {
	svc, _ := NewJWTService("test-secret-at-least-32-characters-long!", 1, "test")
	// Truco: firmamos con expiración mínima, luego esperamos 1.1s
	svc.expiration = 10 * time.Millisecond
	token, _, _ := svc.Sign("u1", "t1", "a", "ADMIN", "n", "e")
	time.Sleep(50 * time.Millisecond)
	_, err := svc.Verify(token)
	require.Error(t, err)
	assert.True(t, strings.Contains(err.Error(), "expired") || strings.Contains(err.Error(), "invalid"))
}

func TestHashPassword_RoundTrip(t *testing.T) {
	h, err := HashPassword("super-secret")
	require.NoError(t, err)
	assert.True(t, CheckPassword("super-secret", h))
	assert.False(t, CheckPassword("incorrecto", h))
}
