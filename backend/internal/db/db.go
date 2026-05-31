// Package db abre la conexión a PostgreSQL usando GORM.
//
// 📚 GORM es el ORM más usado en Go. Similar a Prisma (TypeScript) o
// SQLAlchemy (Python): mapea structs a tablas y permite queries seguras.
package db

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Open conecta a Postgres con configuraciones de pool sensatas.
//
// El context (`ctx`) permite cancelar la operación si tarda demasiado.
// Es un patrón muy común en Go: casi toda función que puede bloquear
// recibe un context.Context como primer argumento.
func Open(ctx context.Context, dsn string, debug bool) (*gorm.DB, error) {
	gormLogLevel := logger.Warn
	if debug {
		gormLogLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:                                   logger.Default.LogMode(gormLogLevel),
		PrepareStmt:                              true,
		DisableForeignKeyConstraintWhenMigrating: false,
		TranslateError:                           true,
	})
	if err != nil {
		return nil, fmt.Errorf("db: abriendo conexión: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("db: obteniendo sql.DB: %w", err)
	}

	// Configuración del pool — ajusta según el tier de Postgres
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	// Verificar que la conexión responde
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(pingCtx); err != nil {
		return nil, fmt.Errorf("db: ping fallido: %w", err)
	}

	slog.Info("✅ PostgreSQL conectado", "maxConns", 25)
	return db, nil
}

// Close cierra la conexión (útil en graceful shutdown).
func Close(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
