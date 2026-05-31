// Package logger crea un logger global usando slog (stdlib desde Go 1.21).
//
// 📚 slog es el logger oficial de Go. No necesitamos dependencias externas.
// Soporta formato JSON (producción) o texto humano (desarrollo).
package logger

import (
	"io"
	"log/slog"
	"os"
	"strings"
)

// New construye un *slog.Logger configurado según el nivel y formato dados.
func New(level, format string, out io.Writer) *slog.Logger {
	if out == nil {
		out = os.Stdout
	}

	lvl := parseLevel(level)
	opts := &slog.HandlerOptions{
		Level:     lvl,
		AddSource: lvl == slog.LevelDebug, // muestra archivo:línea sólo en debug
	}

	var handler slog.Handler
	switch strings.ToLower(format) {
	case "json":
		handler = slog.NewJSONHandler(out, opts)
	default: // pretty (texto) — útil para terminal en dev
		handler = slog.NewTextHandler(out, opts)
	}

	logger := slog.New(handler)
	slog.SetDefault(logger) // disponible vía slog.Info / slog.Error globalmente
	return logger
}

func parseLevel(s string) slog.Level {
	switch strings.ToLower(s) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
