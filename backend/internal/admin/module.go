// Package admin — agregador del módulo de administración.
package admin

import (
	"github.com/admiral/admiral-pro/internal/middleware"
	"github.com/gofiber/fiber/v2"
)

// Module agrupa todas las dependencias del módulo admin.
type Module struct {
	Products   *ProductHandlers
	Categories *CategoryHandlers
	Inventory  *InventoryHandlers
	Users      *UserHandlers
	Import     *ImportHandlers
}

// Register monta todas las sub-rutas de /admin.
// Las rutas son SOLO para roles ADMIN/MANAGER (ya van detrás de JWTAuth).
func (m *Module) Register(r fiber.Router) {
	admin := r.Group("/", middleware.RequireRoles("ADMIN", "MANAGER"))
	m.Products.Register(admin.Group("/products"))
	m.Categories.Register(admin.Group("/categories"))
	m.Inventory.Register(admin.Group("/inventory"))
	m.Users.Register(admin.Group("/users"))
	m.Import.Register(admin.Group("/import"))
}
