package middleware

import (
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
)

// RequestLog escribe una línea de log estructurado por cada request.
// Se ejecuta SIEMPRE — incluso si el handler devuelve error.
func RequestLog() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next() // ejecuta el resto de la cadena
		elapsed := time.Since(start)

		attrs := []any{
			"method", c.Method(),
			"path", c.Path(),
			"status", c.Response().StatusCode(),
			"durationMs", elapsed.Milliseconds(),
			"ip", c.IP(),
		}
		if u := CurrentUser(c); u != nil {
			attrs = append(attrs, "userId", u.Subject, "tenant", u.TenantSlug)
		}

		switch {
		case c.Response().StatusCode() >= 500:
			slog.Error("http", attrs...)
		case c.Response().StatusCode() >= 400:
			slog.Warn("http", attrs...)
		default:
			slog.Info("http", attrs...)
		}
		return err
	}
}
