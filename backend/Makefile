# ════════════════════════════════════════════════════════════
# Admiral Pro Backend — Makefile
# ════════════════════════════════════════════════════════════

.PHONY: help dev build test lint migrate seed clean docker-build run install

# Mostrar ayuda (objetivo por defecto)
help:
	@echo "Admiral Pro Backend (Go)"
	@echo ""
	@echo "  make install      Instala dependencias (go mod download)"
	@echo "  make dev          Corre en modo desarrollo con autoreload (necesita 'air')"
	@echo "  make run          Corre el binario compilado"
	@echo "  make build        Compila a ./bin/admiral-api"
	@echo "  make test         Ejecuta todos los tests"
	@echo "  make test-cov     Tests con cobertura HTML"
	@echo "  make lint         Verifica el código con go vet + golangci-lint"
	@echo "  make migrate-up   Aplica migraciones SQL pendientes"
	@echo "  make migrate-down Revierte la última migración"
	@echo "  make seed         Carga datos iniciales (tenant, usuarios, productos)"
	@echo "  make clean        Elimina ./bin y caché"

install:
	go mod download
	go mod tidy

dev:
	@command -v air >/dev/null 2>&1 || { echo "Instala 'air' con: go install github.com/cosmtrek/air@latest"; exit 1; }
	air

run:
	go run ./cmd/api

build:
	@mkdir -p bin
	CGO_ENABLED=0 go build -ldflags="-s -w" -o bin/admiral-api ./cmd/api
	@echo "✓ Compilado a ./bin/admiral-api"

test:
	go test -race -v ./...

test-cov:
	go test -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "✓ Cobertura abierta en coverage.html"

lint:
	go vet ./...
	@command -v golangci-lint >/dev/null 2>&1 && golangci-lint run || echo "(instala golangci-lint para más checks)"

migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate down 1

migrate-create:
	@read -p "Nombre de la migración: " name; \
	go run ./cmd/migrate create $$name

seed:
	go run ./cmd/seed

clean:
	rm -rf bin coverage.out coverage.html

docker-build:
	docker build -t admiral-pro-api:latest .
