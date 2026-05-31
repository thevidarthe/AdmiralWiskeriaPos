package middleware

import (
	"log/slog"
	"runtime/debug"

	"github.com/admiral/admiral-pro/pkg/httpx"
	"github.com/gofiber/fiber/v2"
)

// Recover atrapa panics inesperados en handlers y devuelve 500 limpio.
// Sin esto, un panic mataría todo el proceso.
//
// 📚 `defer` ejecuta la función al salir del scope, incluso si hubo panic.
// `recover()` adentro de un defer captura el panic y permite continuar.
func Recover() fiber.Handler {
	return func(c *fiber.Ctx) (err error) {
		defer func() {
			if r := recover(); r != nil {
				slog.Error("panic recuperado en handler",
					"panic", r,
					"path", c.Path(),
					"method", c.Method(),
					"stack", string(debug.Stack()),
				)
				err = httpx.InternalError(c, "Algo salió mal procesando tu solicitud")
			}
		}()
		return c.Next()
	}
}
