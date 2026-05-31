// Package middleware contiene middlewares HTTP de Fiber.
//
// 📚 Un middleware en Fiber es una función que recibe el contexto del
// request (*fiber.Ctx) y devuelve un error. Decide si continuar la cadena
// con `c.Next()` o cortar con una respuesta de error.
package middleware

import (
	"strings"

	"github.com/admiral/admiral-pro/internal/auth"
	"github.com/admiral/admiral-pro/internal/ctxkeys"
	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
)

// JWTAuth verifica el token Bearer y carga el usuario al contexto.
// Si el token falta o es inválido devuelve 401.
//
// Las rutas que necesitan auth se envuelven así:
//
//	r := app.Group("/pos", middleware.JWTAuth(jwtService))
//	r.Get("/sales", listSales)
func JWTAuth(jwt *auth.JWTService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" {
			return httpx.Unauthorized(c, "Token requerido")
		}
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return httpx.Unauthorized(c, "Formato de Authorization inválido (esperado: Bearer <token>)")
		}

		claims, err := jwt.Verify(parts[1])
		if err != nil {
			return httpx.Unauthorized(c, "Token inválido o expirado")
		}

		// Guarda los claims en el contexto. Los handlers los leen con
		// middleware.CurrentUser(c).
		c.Locals(ctxkeys.CtxUser, claims)
		return c.Next()
	}
}

// RequireRoles asegura que el usuario tenga uno de los roles indicados.
// Usar DESPUÉS de JWTAuth en la cadena.
func RequireRoles(roles ...string) fiber.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[strings.ToUpper(r)] = struct{}{}
	}
	return func(c *fiber.Ctx) error {
		u := CurrentUser(c)
		if u == nil {
			return httpx.Unauthorized(c, "Sesión inválida")
		}
		if _, ok := allowed[u.Role]; !ok {
			return httpx.Forbidden(c, "Rol no autorizado para esta operación")
		}
		return c.Next()
	}
}

// CurrentUser obtiene los claims del usuario autenticado del contexto.
// Devuelve nil si no hay sesión activa.
func CurrentUser(c *fiber.Ctx) *auth.Claims {
	v, ok := c.Locals(ctxkeys.CtxUser).(*auth.Claims)
	if !ok {
		return nil
	}
	return v
}
