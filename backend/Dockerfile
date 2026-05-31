# ═══════════════════════════════════════════════════════════
# Admiral Pro Backend — Dockerfile multi-stage
# Resultado: imagen final de ~25 MB con un solo binario
# ═══════════════════════════════════════════════════════════

# ── Stage 1: build ─────────────────────────────────────────
FROM golang:1.23-alpine AS builder

WORKDIR /src

# Cache de dependencias
COPY go.mod go.sum ./
RUN go mod download

# Copiar código y compilar
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -X main.buildVersion=2.0.0" \
    -o /out/admiral-api ./cmd/api && \
    go build -o /out/admiral-migrate ./cmd/migrate && \
    go build -o /out/admiral-seed ./cmd/seed

# ── Stage 2: runtime ───────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S admiral && adduser -S admiral -G admiral

WORKDIR /app
COPY --from=builder /out/admiral-api /app/
COPY --from=builder /out/admiral-migrate /app/
COPY --from=builder /out/admiral-seed /app/
COPY --from=builder /src/migrations /app/migrations

USER admiral
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:4000/api/v1/health/ping || exit 1

CMD ["./admiral-api"]
