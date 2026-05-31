// cmd/migrate — runner de migraciones SQL con golang-migrate.
//
// Uso:
//   go run ./cmd/migrate up         # aplica todas las pendientes
//   go run ./cmd/migrate down 1     # revierte la última
//   go run ./cmd/migrate version    # imprime la versión actual
package main

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/admiral/admiral-pro/internal/config"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	m, err := migrate.New("file://migrations", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("migrate init: ", err)
	}
	defer func() { _, _ = m.Close() }()

	cmd := "up"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}

	switch cmd {
	case "up":
		err = m.Up()
	case "down":
		n := 1
		if len(os.Args) > 2 {
			n, _ = strconv.Atoi(os.Args[2])
		}
		err = m.Steps(-n)
	case "version":
		v, dirty, e := m.Version()
		if e != nil {
			log.Fatal(e)
		}
		fmt.Printf("Versión: %d (dirty=%v)\n", v, dirty)
		return
	case "force":
		if len(os.Args) < 3 {
			log.Fatal("uso: migrate force <version>")
		}
		v, _ := strconv.Atoi(os.Args[2])
		err = m.Force(v)
	default:
		log.Fatalf("comando desconocido: %s (up | down | version | force)", cmd)
	}

	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		log.Fatal(err)
	}
	fmt.Println("✓ Migraciones OK")
}
