// Package httpx — validador de DTOs con go-playground/validator.
package httpx

import (
	"fmt"
	"strings"
	"sync"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

var (
	validateOnce sync.Once
	validate     *validator.Validate
)

// Validator devuelve la instancia singleton de validator.
func Validator() *validator.Validate {
	validateOnce.Do(func() {
		validate = validator.New(validator.WithRequiredStructEnabled())
	})
	return validate
}

// BindAndValidate parsea el body JSON y valida el DTO en una sola llamada.
// Si falla, escribe 400 con los detalles y devuelve un error para que el
// handler termine inmediatamente con `return httpx.BindAndValidate(...)`.
func BindAndValidate(c *fiber.Ctx, dto any) error {
	if err := c.BodyParser(dto); err != nil {
		return BadRequest(c, "JSON inválido: "+err.Error())
	}
	if err := Validator().Struct(dto); err != nil {
		return BadRequest(c, "Datos inválidos", formatValidationErrors(err))
	}
	return nil
}

func formatValidationErrors(err error) map[string]string {
	out := make(map[string]string)
	if ve, ok := err.(validator.ValidationErrors); ok {
		for _, f := range ve {
			out[strings.ToLower(f.Field())] = humanizeTag(f)
		}
	} else {
		out["_"] = err.Error()
	}
	return out
}

func humanizeTag(f validator.FieldError) string {
	switch f.Tag() {
	case "required":
		return "campo requerido"
	case "email":
		return "debe ser un email válido"
	case "min":
		return fmt.Sprintf("mínimo %s", f.Param())
	case "max":
		return fmt.Sprintf("máximo %s", f.Param())
	case "len":
		return fmt.Sprintf("debe tener exactamente %s caracteres", f.Param())
	case "uuid":
		return "debe ser un UUID válido"
	case "gte":
		return fmt.Sprintf("debe ser >= %s", f.Param())
	case "lte":
		return fmt.Sprintf("debe ser <= %s", f.Param())
	case "oneof":
		return fmt.Sprintf("debe ser uno de: %s", f.Param())
	default:
		return "valor inválido"
	}
}
