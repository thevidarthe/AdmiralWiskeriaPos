// Package httpx contiene helpers para respuestas HTTP consistentes.
package httpx

import (
	"errors"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ErrorResponse es el formato uniforme de errores que devuelve la API.
type ErrorResponse struct {
	Error     string `json:"error"`
	Message   string `json:"message"`
	Details   any    `json:"details,omitempty"`
	Path      string `json:"path,omitempty"`
	Timestamp string `json:"timestamp,omitempty"`
}

// JSON envía un objeto como JSON con el statusCode dado.
func JSON(c *fiber.Ctx, status int, v any) error {
	return c.Status(status).JSON(v)
}

// BadRequest devuelve 400 con mensaje. Usar para input inválido del usuario.
func BadRequest(c *fiber.Ctx, msg string, details ...any) error {
	r := ErrorResponse{Error: "BadRequest", Message: msg, Path: c.Path()}
	if len(details) > 0 {
		r.Details = details[0]
	}
	return c.Status(http.StatusBadRequest).JSON(r)
}

// Unauthorized devuelve 401. Usar cuando falta o es inválido el token.
func Unauthorized(c *fiber.Ctx, msg string) error {
	if msg == "" {
		msg = "No autorizado"
	}
	return c.Status(http.StatusUnauthorized).JSON(ErrorResponse{Error: "Unauthorized", Message: msg})
}

// Forbidden devuelve 403. Usar cuando el usuario está autenticado pero no tiene el rol/permiso.
func Forbidden(c *fiber.Ctx, msg string) error {
	if msg == "" {
		msg = "Acceso restringido"
	}
	return c.Status(http.StatusForbidden).JSON(ErrorResponse{Error: "Forbidden", Message: msg})
}

// NotFound devuelve 404.
func NotFound(c *fiber.Ctx, what string) error {
	if what == "" {
		what = "Recurso no encontrado"
	}
	return c.Status(http.StatusNotFound).JSON(ErrorResponse{Error: "NotFound", Message: what})
}

// Conflict devuelve 409 (recurso duplicado, estado inconsistente).
func Conflict(c *fiber.Ctx, msg string) error {
	return c.Status(http.StatusConflict).JSON(ErrorResponse{Error: "Conflict", Message: msg})
}

// InternalError devuelve 500. Loguear con slog antes de llamarla.
func InternalError(c *fiber.Ctx, msg string) error {
	if msg == "" {
		msg = "Error interno del servidor"
	}
	return c.Status(http.StatusInternalServerError).JSON(ErrorResponse{Error: "InternalError", Message: msg})
}

// FromError mapea automáticamente errores comunes a respuestas HTTP.
// Si recibe un error de GORM (ej: ErrRecordNotFound) lo convierte en 404.
func FromError(c *fiber.Ctx, err error) error {
	if err == nil {
		return nil
	}
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		return NotFound(c, "Recurso no encontrado")
	case errors.Is(err, gorm.ErrDuplicatedKey):
		return Conflict(c, "Valor duplicado")
	case errors.Is(err, gorm.ErrInvalidData):
		return BadRequest(c, "Datos inválidos")
	default:
		return InternalError(c, err.Error())
	}
}
