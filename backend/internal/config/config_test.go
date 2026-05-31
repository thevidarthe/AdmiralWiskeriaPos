package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidate_RejectsShortJWT(t *testing.T) {
	c := &Config{JWTSecret: "short", DatabaseURL: "postgres://x", AppPort: 4000}
	err := validate(c)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "JWT_SECRET")
}

func TestValidate_BlocksDefaultsInProd(t *testing.T) {
	c := &Config{
		AppEnv:      EnvProduction,
		JWTSecret:   "GENERATE_WITH_openssl_rand_base64_64_THIS_IS_NOT_SAFE_IN_PROD",
		DatabaseURL: "postgres://x",
		AppPort:     4000,
	}
	err := validate(c)
	assert.Error(t, err)
}

func TestValidate_AcceptsGoodConfig(t *testing.T) {
	c := &Config{
		AppEnv:      EnvProduction,
		JWTSecret:   "this-is-a-very-long-secret-of-more-than-32-characters!!",
		DatabaseURL: "postgres://user:pwd@host/db",
		AppPort:     4000,
	}
	err := validate(c)
	assert.NoError(t, err)
}

func TestAllowedOrigins_SplitsCSV(t *testing.T) {
	os.Setenv("FRONTEND_URL", "https://a.com, https://b.com")
	defer os.Unsetenv("FRONTEND_URL")
	c := Config{FrontendURL: "https://a.com, https://b.com"}
	got := c.AllowedOrigins()
	assert.Equal(t, []string{"https://a.com", "https://b.com"}, got)
}
