package pos

import (
	"net/http"
	"strings"
	"testing"

	"github.com/admiral/admiral-pro/internal/config"
	"github.com/admiral/admiral-pro/internal/ctxkeys"
	"github.com/admiral/admiral-pro/internal/auth"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func setupApp(cfg *config.Config, withAuth bool, role string) *fiber.App {
	app := fiber.New()
	h := NewHandlers(nil, cfg)

	v1 := app.Group("/api/v1")

	if withAuth {
		private := v1.Group("/", func(c *fiber.Ctx) error {
			c.Locals(ctxkeys.CtxUser, &auth.Claims{
				RegisteredClaims: jwt.RegisteredClaims{
					Subject: "user-1",
				},
				TenantID:   "tenant-1",
				TenantSlug: "admiral",
				Role:       role,
			})
			return c.Next()
		})
		h.Register(private.Group("/pos"))
	} else {
		h.Register(v1.Group("/pos"))
	}

	return app
}

func TestSimulateWeather_NotRegisteredInProd(t *testing.T) {
	cfg := &config.Config{
		AppEnv:                 config.EnvProduction,
		SimulateWeatherEnabled: true,
	}
	app := setupApp(cfg, true, "ADMIN")

	req, _ := http.NewRequest("POST", "/api/v1/pos/simulate-weather", strings.NewReader(`{"weather":"rainy"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestSimulateWeather_NotRegisteredWhenDisabled(t *testing.T) {
	cfg := &config.Config{
		AppEnv:                 config.EnvDevelopment,
		SimulateWeatherEnabled: false,
	}
	app := setupApp(cfg, true, "ADMIN")

	req, _ := http.NewRequest("POST", "/api/v1/pos/simulate-weather", strings.NewReader(`{"weather":"rainy"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestSimulateWeather_RequiresAuth(t *testing.T) {
	cfg := &config.Config{
		AppEnv:                 config.EnvDevelopment,
		SimulateWeatherEnabled: true,
	}
	app := setupApp(cfg, false, "")

	req, _ := http.NewRequest("POST", "/api/v1/pos/simulate-weather", strings.NewReader(`{"weather":"rainy"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestSimulateWeather_RequiresAdminOrManager(t *testing.T) {
	cfg := &config.Config{
		AppEnv:                 config.EnvDevelopment,
		SimulateWeatherEnabled: true,
	}
	app := setupApp(cfg, true, "WAITER")

	req, _ := http.NewRequest("POST", "/api/v1/pos/simulate-weather", strings.NewReader(`{"weather":"rainy"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}
