// Package config carga y valida las variables de entorno de la aplicación.
//
// 📚 Patrones de Go que se usan aquí:
//   - struct con tags (`env:"..."`): la librería caarlos0/env lee la variable
//     de entorno con ese nombre y rellena el campo del struct.
//   - return múltiple (Config, error): Go no usa try/catch; en su lugar,
//     toda función que puede fallar devuelve (valor, error) y el caller
//     decide qué hacer con `if err != nil { ... }`.
package config

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

// Env representa los entornos donde puede correr la app.
type Env string

const (
	EnvDevelopment Env = "development"
	EnvProduction  Env = "production"
	EnvTest        Env = "test"
)

// Config agrupa toda la configuración tipada de la aplicación.
// Cada campo tiene tags `env:"..."` que indican qué variable lo rellena.
type Config struct {
	// Aplicación
	AppEnv      Env    `env:"APP_ENV" envDefault:"development"`
	AppPort     int    `env:"APP_PORT" envDefault:"4000"`
	AppName     string `env:"APP_NAME" envDefault:"Admiral Pro"`
	AppURL      string `env:"APP_URL" envDefault:"http://localhost:4000"`
	FrontendURL string `env:"FRONTEND_URL" envDefault:"http://localhost:3000"`

	// Base de datos
	DatabaseURL string `env:"DATABASE_URL,required"`

	// Redis (colas + rate limit)
	RedisAddr     string `env:"REDIS_ADDR" envDefault:"localhost:6379"`
	RedisPassword string `env:"REDIS_PASSWORD"`
	RedisDB       int    `env:"REDIS_DB" envDefault:"0"`

	// JWT
	JWTSecret       string `env:"JWT_SECRET,required"`
	JWTExpiresHours int    `env:"JWT_EXPIRES_HOURS" envDefault:"8"`

	// Rate limit
	RateLimitMax       int `env:"RATE_LIMIT_MAX" envDefault:"120"`
	RateLimitWindowSec int `env:"RATE_LIMIT_WINDOW_SEC" envDefault:"60"`
	RateLimitAuthMax   int `env:"RATE_LIMIT_AUTH_MAX" envDefault:"10"`

	// Simulate Weather (dev/staging only)
	SimulateWeatherEnabled bool `env:"SIMULATE_WEATHER_ENABLED" envDefault:"false"`

	// Tenant/Branch defaults
	DefaultTenantSlug string `env:"DEFAULT_TENANT_SLUG" envDefault:"admiral"`
	DefaultTenantName string `env:"DEFAULT_TENANT_NAME" envDefault:"Admiral Whiskería"`
	DefaultBranchSlug string `env:"DEFAULT_BRANCH_SLUG" envDefault:"sandoná"`

	// WhatsApp
	WhatsAppEnabled            bool   `env:"WHATSAPP_ENABLED" envDefault:"false"`
	WhatsAppPhoneNumberID      string `env:"WHATSAPP_PHONE_NUMBER_ID"`
	WhatsAppAccessToken        string `env:"WHATSAPP_ACCESS_TOKEN"`
	WhatsAppWebhookVerifyToken string `env:"WHATSAPP_WEBHOOK_VERIFY_TOKEN"`
	WhatsAppAppSecret          string `env:"WHATSAPP_APP_SECRET"`
	WhatsAppAPIVersion         string `env:"WHATSAPP_API_VERSION" envDefault:"v19.0"`

	// Logging
	LogLevel  string `env:"LOG_LEVEL" envDefault:"info"`
	LogFormat string `env:"LOG_FORMAT" envDefault:"json"`

	// Uploads
	UploadDir       string `env:"UPLOAD_DIR" envDefault:"./uploads"`
	UploadMaxSizeMB int    `env:"UPLOAD_MAX_SIZE_MB" envDefault:"5"`

	// Security
	// Cuando se despliega detrás de un proxy inverso que termina TLS (p.ej. Railway,
	// Heroku, o un balanceador), poner TRUSTED_PROXY=true permite que la app confíe
	// en cabeceras como `X-Forwarded-Proto` para detectar HTTPS.
	TrustedProxy bool `env:"TRUSTED_PROXY" envDefault:"false"`
}

// IsProd devuelve true si APP_ENV=production.
func (c Config) IsProd() bool { return c.AppEnv == EnvProduction }

// IsDev devuelve true si APP_ENV=development.
func (c Config) IsDev() bool { return c.AppEnv == EnvDevelopment }

// AllowedOrigins parsea FRONTEND_URL (puede ser CSV) en una lista.
func (c Config) AllowedOrigins() []string {
	parts := strings.Split(c.FrontendURL, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if s := strings.TrimSpace(p); s != "" {
			out = append(out, s)
		}
	}
	return out
}

// Load lee .env (si existe) y rellena un Config validado.
//
// 📚 Errores en Go:
//   - errors.New / fmt.Errorf crean errores
//   - errors.Join combina varios errores en uno solo
func Load() (*Config, error) {
	// Si existe .env en el directorio actual, lo cargamos.
	// En producción (Railway) las vars vienen del entorno, no de un archivo.
	if _, err := os.Stat(".env"); err == nil {
		_ = godotenv.Load(".env")
	}

	var c Config
	if err := env.Parse(&c); err != nil {
		return nil, fmt.Errorf("config: cargando env: %w", err)
	}

	if err := validate(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func validate(c *Config) error {
	var errs []error

	// JWT_SECRET tiene que ser robusto en cualquier entorno
	if len(c.JWTSecret) < 32 {
		errs = append(errs, errors.New("JWT_SECRET debe tener al menos 32 caracteres"))
	}
	// En producción bloqueamos secretos por defecto
	if c.IsProd() {
		if strings.Contains(c.JWTSecret, "GENERATE") || strings.Contains(c.JWTSecret, "CHANGE") {
			errs = append(errs, errors.New("JWT_SECRET en producción no puede ser el valor por defecto"))
		}
		if strings.Contains(c.DatabaseURL, "CHANGE") {
			errs = append(errs, errors.New("DATABASE_URL en producción no puede ser el valor por defecto"))
		}
	}
	if c.AppPort < 1 || c.AppPort > 65535 {
		errs = append(errs, fmt.Errorf("APP_PORT inválido: %d", c.AppPort))
	}

	return errors.Join(errs...)
}
