// Package health — endpoint /health para verificar el estado del servicio.
package health

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type Handlers struct {
	db    *gorm.DB
	build string
}

func NewHandlers(db *gorm.DB, buildVersion string) *Handlers {
	return &Handlers{db: db, build: buildVersion}
}

// Register monta rutas /health/* (público, sin auth).
func (h *Handlers) Register(r fiber.Router) {
	r.Get("/ping", h.Ping)
	r.Get("/", h.Check)
}

// Ping responde con 200 OK sin tocar la BD (útil para load balancers).
func (h *Handlers) Ping(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":    "ok",
		"version":   h.build,
		"timestamp": time.Now().UTC(),
	})
}

// Check verifica conexión a la base de datos.
func (h *Handlers) Check(c *fiber.Ctx) error {
	checks := fiber.Map{"app": "ok"}
	overall := "ok"

	if h.db != nil {
		ctx, cancel := context.WithTimeout(c.Context(), 2*time.Second)
		defer cancel()
		sqlDB, err := h.db.DB()
		if err == nil {
			if err := sqlDB.PingContext(ctx); err != nil {
				checks["database"] = "down: " + err.Error()
				overall = "degraded"
			} else {
				checks["database"] = "ok"
			}
		} else {
			checks["database"] = "down: " + err.Error()
			overall = "degraded"
		}
	}

	status := fiber.StatusOK
	if overall != "ok" {
		status = fiber.StatusServiceUnavailable
	}
	return c.Status(status).JSON(fiber.Map{
		"status":  overall,
		"version": h.build,
		"checks":  checks,
		"time":    time.Now().UTC(),
	})
}
