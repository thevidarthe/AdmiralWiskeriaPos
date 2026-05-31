# Admiral Pro · Backend (Go)

API HTTP del sistema Admiral Whiskería: POS + CRM + Inventario + WhatsApp + QR.

Stack: **Go 1.22 + Fiber + GORM + PostgreSQL 16 + Redis**.

---

## Requisitos

- Go 1.22+
- PostgreSQL 16 (local o Docker)
- Redis 7 (opcional, sólo para colas WhatsApp)

## Setup rápido

```bash
# 1. Clonar e instalar dependencias
cd backend
go mod download

# 2. Configurar variables de entorno
cp .env.example .env
# editar .env: JWT_SECRET (>=32 chars), DATABASE_URL, etc.

# 3. Levantar Postgres con docker-compose (en la raíz del repo)
docker compose up -d postgres redis

# 4. Aplicar migraciones
go run ./cmd/migrate up

# 5. Cargar datos iniciales (tenant, sucursal, usuarios demo, productos)
go run ./cmd/seed

# 6. Arrancar la API
go run ./cmd/api
# → http://localhost:4000/api/v1
```

## Estructura

```
backend/
├── cmd/
│   ├── api/       # punto de entrada del servidor HTTP
│   ├── migrate/   # runner de migraciones SQL
│   └── seed/      # carga inicial de datos
├── internal/      # código privado del módulo (no importable desde fuera)
│   ├── config/    # carga + validación de variables de entorno
│   ├── db/        # conexión GORM a PostgreSQL
│   ├── domain/    # structs mapeados a tablas
│   ├── auth/      # JWT, login, hash, anti-fuerza-bruta
│   ├── middleware/# auth, recover, logging, rate limit
│   ├── event/     # event bus en memoria
│   ├── menu/      # categorías + productos (lectura)
│   ├── promotion/ # motor de descuentos
│   ├── pos/       # ventas, items, pagos, cancelaciones
│   ├── crm/       # clientes, lealtad
│   ├── qr/        # generación + resolución pública
│   ├── whatsapp/  # campañas + webhook HMAC
│   ├── admin/     # productos, categorías, inventario, usuarios, import
│   ├── report/    # reportes diarios + export Excel
│   └── health/    # /health para Railway
├── pkg/           # código reusable (logger, helpers HTTP)
├── migrations/    # SQL versionado con golang-migrate
└── test/          # tests de integración (opcional)
```

## Endpoints principales

Todos prefijados con `/api/v1`.

### Públicos (sin auth)
- `GET  /health/ping` — liveness probe
- `GET  /health` — readiness (verifica BD)
- `POST /auth/login` — login email + password
- `POST /auth/pin` — login con PIN (4 dígitos)
- `GET  /auth/users/:tenantSlug` — usuarios activos para selector de rol
- `GET  /qr/resolve/:token` — info de la mesa desde el QR
- `GET  /qr/menu/:token` — menú público del bar para clientes
- `POST /qr/call-waiter/:token` — llamar al mesero
- `GET/POST /whatsapp/webhook` — webhook firmado de Meta

### Privados (Bearer JWT)
- `GET  /auth/me` — datos del usuario actual
- `PUT  /auth/me/password` — cambiar contraseña
- `PUT  /auth/me/pin` — cambiar PIN
- `GET  /menu/categories`, `/menu/products`
- `GET  /promotions/active`, `POST /promotions/calculate`, `GET /promotions/coupons/validate`
- `GET/POST /pos/sales`, `/pos/sales/:id`, `/pos/sales/:id/items`, `/pos/sales/:id/close`, `/pos/sales/:id/cancel`
- `GET/POST/PUT /crm/customers`, `PUT /crm/customers/:id/consent`, `POST /crm/segments/preview`
- `POST /qr/codes` (ADMIN/MANAGER), `GET /qr/codes`
- `GET/POST /whatsapp/campaigns`
- `GET /reports/daily-close`, `GET /reports/daily-close/export`
- `/admin/products`, `/admin/categories`, `/admin/inventory`, `/admin/users`, `/admin/import` (todas con `RequireRoles("ADMIN","MANAGER")`)

## Seguridad

- **JWT** firmado HS256 con secret de >= 32 caracteres (validado al startup)
- **bcrypt cost 12** para passwords y PINs
- **Anti-fuerza-bruta**: bloqueo de 15 min tras 5 intentos fallidos
- **Rate limit global** (120 req/min por IP) + límite estricto en `/auth/*` (10/min)
- **CORS** restringido a `FRONTEND_URL`
- **Helmet** vía Fiber defaults
- **HMAC SHA-256** para verificar webhooks de Meta WhatsApp
- **Validación** en cada DTO con `go-playground/validator`
- **PrepareStmt** en GORM para evitar SQL injection

## Comandos

```bash
make install       # go mod download
make dev           # autoreload con air
make build         # binario en ./bin/admiral-api
make test          # ejecuta todos los tests
make test-cov      # cobertura HTML
make lint          # go vet + golangci-lint
make migrate-up    # aplica migraciones pendientes
make seed          # datos iniciales
```

## Tests

Cobertura mínima de auth, config y CRM. Ampliar con:
- `go test -race -v ./internal/...`
- `make test-cov` y abrir `coverage.html`

## Deploy en Railway

1. Hacer push a GitHub
2. Railway detecta `railway.json` automáticamente
3. Variables a configurar en el dashboard:
   - `DATABASE_URL` (Railway PostgreSQL plugin lo inyecta solo)
   - `JWT_SECRET` (`openssl rand -base64 64`)
   - `FRONTEND_URL` (URL del frontend, exacta)
   - `WHATSAPP_*` si vas a usar la integración
4. El comando de build/start está en `railway.json`. Las migraciones corren automáticamente en cada deploy.

## Aprender Go con este proyecto

Mira [`docs/APRENDER-GO.md`](../docs/APRENDER-GO.md) — explica los patrones del lenguaje que se usan en cada parte del código.
