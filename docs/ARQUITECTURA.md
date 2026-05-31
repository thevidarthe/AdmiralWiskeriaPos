# Arquitectura técnica

## Visión general

```
┌─────────────┐  HTTPS  ┌──────────────────┐  SQL   ┌──────────────┐
│ Next.js PWA │ ───────▶│  Go API (Fiber)  │ ─────▶ │  PostgreSQL  │
│ (frontend)  │         │   binario único  │        │      16      │
└─────────────┘         │       25 MB      │        └──────────────┘
       │                └─────────┬────────┘                ▲
       │                          │ TCP                     │
       │                  ┌───────▼──────┐                  │
       └──────────────────│    Redis     │──────────────────┘
                           │  (cola WA)  │   (rate limit, etc.)
                           └─────────────┘
```

## Decisiones clave

### Backend en Go (no Node)

- Binario único (~25 MB) vs node_modules (~200 MB)
- Concurrencia goroutines: ideal para WebSockets de mesas en vivo
- Sin GC pauses notables; latencia más predecible
- Cross-compilation trivial (Linux ARM/AMD/macOS desde Windows)

### Fiber + GORM

- Fiber: sintaxis Express-like (curva mínima viniendo de Node)
- GORM: ORM tipo Prisma con `Preload`, transacciones, hooks

### PostgreSQL 16 + golang-migrate

- Migraciones SQL "puras" en `backend/migrations/*.sql` con versionado
- Triggers `updated_at` automáticos
- Multi-tenant por columna `tenant_id` en todas las tablas
- (RLS en una segunda versión cuando haya múltiples instancias compartidas)

### Event bus en memoria

- Para un nodo: suficiente
- Eventos: `sale.closed`, `sale.cancelled`, `qr.waiterCalled`, etc.
- Cuando se escale a N nodos, sustituir por Redis Pub/Sub manteniendo el `Bus.Emit/On` interface

### Frontend Next.js como PWA

- App Router (14)
- Tailwind + paleta navy + gold premium
- Zustand para state local (auth, POS)
- React Query para data del servidor
- next-pwa para Service Worker e instalable

### Seguridad

| Capa | Mecanismo |
| --- | --- |
| Transporte | HTTPS forzado en Railway |
| Identidad | JWT HS256 (secret >= 32 chars validado al startup) |
| Credenciales | bcrypt cost 12 |
| Fuerza bruta | 5 intentos → bloqueo 15 min |
| Rate limit global | 120 req/min/IP |
| Rate limit /auth | 10 req/min/IP |
| CORS | whitelist exacta de `FRONTEND_URL` |
| Webhooks | HMAC-SHA256 (Meta WhatsApp) |
| SQL injection | GORM PrepareStmt + queries parametrizadas |
| Input | go-playground/validator en cada DTO |

## Multi-tenant

Cada tabla de negocio incluye `tenant_id UUID`. Todo SELECT/INSERT pasa por
`WHERE tenant_id = ?`. La verificación se hace en el service layer; el
JWT carga `tenantId` en cada request.

Para una segunda fase: PostgreSQL Row Level Security activado por
tenant_id leído de `app.current_tenant_id` (variable de sesión).

## Performance

- Pool de conexiones: 25 abiertas, 5 idle, ciclo de 30 min
- `PrepareStmt: true` en GORM (queries pre-compiladas)
- Índices estratégicos en columnas filtradas: `tenant_id`, `branch_id`, `status`, `(tenant_id, opened_at DESC)`
- Goroutines para eventos: el cierre de venta no espera al WhatsApp
- Rate limit en Fiber (memory-based; OK para 1 nodo)

## Escala

| Métrica | Límite teórico actual |
| --- | --- |
| Ventas/mes | ~100.000 |
| Mesas activas concurrentes | ~50/sucursal |
| Productos en catálogo | ~10.000 |
| Usuarios staff concurrentes | ~100/sucursal |

Más allá: shard por tenant, read replicas, particionar `sale_items` por fecha.

## Deploy

Railway con `railway.json`:
1. `go build` → binario único
2. `./admiral-migrate up` antes de arrancar
3. `./admiral-api` corre con `PORT` que Railway inyecta
4. Healthcheck `/api/v1/health/ping` cada 30s

CI en GitHub Actions: vet + test + build cada push.
