# Admiral Whiskería Pro

Sistema profesional de POS para bar/whiskería con:
- POS de barra y mesas con tabs simultáneos
- CRM con niveles de lealtad y puntos automáticos
- Inventario con compras, mermas, alertas y conteo físico
- QR por mesa con menú digital y llamada a mesero
- WhatsApp Business: campañas y mensajes transaccionales
- Reportes diarios exportables a Excel
- PWA instalable en celular, multi-tenant, multi-sucursal

## Stack

- **Backend**: Go 1.22 + Fiber + GORM + PostgreSQL 16 + Redis (binario único ~25 MB)
- **Frontend**: Next.js 14 + React 18 + Tailwind + Zustand + PWA
- **Infra**: Docker, Railway, GitHub Actions

## Empezar

```bash
git clone <repo>
cd admiral-pro
./setup.sh                     # levanta postgres+redis, migra, seed
cd backend && go run ./cmd/api # terminal 1
cd frontend && npm run dev     # terminal 2
# → http://localhost:3000
```

## Estructura del repositorio

```
admiral-pro/
├── backend/                Backend en Go (API HTTP)
├── frontend/               Frontend Next.js (PWA)
├── docs/
│   ├── APRENDER-GO.md      Guía pedagógica de Go
│   └── ARQUITECTURA.md     Decisiones técnicas
├── .github/workflows/      CI + Deploy
├── docker-compose.yml      Postgres + Redis + backend
└── setup.sh                Setup completo en 1 comando
```

## Documentación

- [`backend/README.md`](backend/README.md) — endpoints, seguridad, deploy
- [`docs/APRENDER-GO.md`](docs/APRENDER-GO.md) — aprende Go con este proyecto
- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — decisiones técnicas

## Seguridad

Ver `backend/README.md` § Seguridad. Aspectos clave:
- JWT con secret validado (>= 32 chars, bloqueado por defecto en producción)
- bcrypt cost 12 para passwords y PINs
- Anti-fuerza-bruta (5 intentos → bloqueo 15 min)
- Rate limit global + estricto en `/auth/*`
- HMAC-SHA256 para webhooks WhatsApp
- CORS restringido al frontend autorizado
- Validación estricta de DTOs en cada endpoint

## Licencia

Software propietario · Admiral Wiskeria © 2026
