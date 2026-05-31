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

---

## Guía de inicio rápido (paso a paso)

### Requisitos

| Herramienta | Versión mínima | Cómo verificar         |
| ----------- | -------------- | ---------------------- |
| Docker      | 24+            | `docker --version`     |
| Go          | 1.22+          | `go version`           |
| Node.js     | 20+            | `node -v`              |
| npm         | 10+            | `npm -v`               |

### 1. Clonar el repositorio

```bash
git clone https://github.com/thevidarthe/AdmiralWiskeriaPos.git
cd AdmiralWiskeriaPos
```

### 2. Setup automatizado (recomendado)

Ejecuta el script de setup que levanta PostgreSQL, Redis, instala dependencias, corre migraciones y seed:

```bash
./setup.sh
```

> **Windows**: Ejecuta los pasos manuales (abajo) o usa Git Bash / WSL.

### 3. Setup manual (paso por paso)

#### 3.1 Levantar bases de datos (PostgreSQL + Redis)

```bash
docker compose up -d postgres redis
```

Esto inicia:
- **PostgreSQL 16** en `localhost:5432`
- **Redis 7** en `localhost:6379`

#### 3.2 Configurar variables de entorno

Backend:
```bash
cp backend/.env.example backend/.env
# Editar JWT_SECRET y DATABASE_URL si es necesario
```

Frontend:
```bash
cp frontend/.env.example frontend/.env.local
```

#### 3.3 Instalar dependencias

```bash
# Backend (Go)
cd backend && go mod download && cd ..

# Frontend (Node.js)
cd frontend && npm install && cd ..
```

#### 3.4 Correr migraciones y seed

```bash
cd backend
go run ./cmd/migrate up
go run ./cmd/seed
cd ..
```

#### 3.5 Iniciar el sistema

Abre **dos terminales**:

| Terminal | Comando                          | Puerto |
| -------- | -------------------------------- | ------ |
| Backend  | `cd backend && go run ./cmd/api` | `4000` |
| Frontend | `cd frontend && npm run dev`     | `3000` |

Luego abre **http://localhost:3000** en tu navegador.

### 4. Usuarios de prueba

| Correo              | Contraseña      | PIN   | Rol      |
| ------------------- | --------------- | ----- | -------- |
| admin@admiral.co    | Admiral2026!    | 1234  | Admin    |
| andres@admiral.co   | Barista2026!    | 1111  | Barista  |
| juliana@admiral.co  | Mesero2026!     | 2222  | Mesero   |

---

## Docker compose (todo en uno)

Para levantar **todo el sistema** (incluyendo backend compilado):

```bash
docker compose up -d
```

Esto levanta PostgreSQL, Redis, backend Go y n8n (automatizaciones).

---

## Rutas del frontend

| Ruta             | Roles                         | Descripción                     |
| ---------------- | ----------------------------- | ------------------------------- |
| `/login`         | Público                       | Selector de usuario + PIN       |
| `/admin/*`       | ADMIN, MANAGER                | Panel completo de gestión       |
| `/pos`           | ADMIN, MANAGER, BARISTA, CASHIER | POS de barra con cobros      |
| `/mesero`        | ADMIN, MANAGER, WAITER        | Panel de mesas activas          |
| `/qr/[token]`    | Público                       | Menú digital del cliente        |

---

## API endpoints

La API corre en `http://localhost:4000/api/v1`.

Ver documentación completa en [`backend/README.md`](backend/README.md).

---

## Estructura del proyecto

```
admiral-pro/
├── backend/                Backend en Go (API REST)
│   ├── cmd/api/            Punto de entrada del servidor
│   ├── cmd/migrate/        Migraciones de BD
│   ├── cmd/seed/           Datos de prueba
│   ├── internal/           Lógica de negocio
│   │   ├── auth/           Autenticación JWT
│   │   ├── pos/            Punto de venta
│   │   ├── admin/          Admin (productos, categorías, etc.)
│   │   ├── menu/           Menú digital
│   │   ├── crm/            CRM y lealtad
│   │   ├── promotion/      Promociones
│   │   ├── report/         Reportes
│   │   ├── qr/             Generación de QR
│   │   └── whatsapp/       WhatsApp Business
│   ├── migrations/         Archivos SQL (up/down)
│   └── pkg/                Utilidades compartidas
├── frontend/               Frontend Next.js (PWA)
│   ├── src/app/            Páginas (App Router)
│   ├── src/components/     Componentes UI
│   ├── src/store/          Estado global (Zustand)
│   └── src/lib/            Cliente HTTP y utilerías
├── docs/                   Documentación
│   ├── APRENDER-GO.md      Guía pedagógica de Go
│   └── ARQUITECTURA.md     Decisiones técnicas
├── .github/workflows/      CI/CD (GitHub Actions)
├── docker-compose.yml      Infraestructura local
└── setup.sh                Setup completo en 1 comando
```

---

## Despliegue en Railway

Ver guías detalladas:
- [`RAILWAY_DEPLOYMENT_PASO_A_PASO.md`](RAILWAY_DEPLOYMENT_PASO_A_PASO.md)
- [`README_DEPLOYMENT.md`](README_DEPLOYMENT.md)
- [`GUIA_DEPLOYMENT_VIVO.md`](GUIA_DEPLOYMENT_VIVO.md)

---

## Seguridad

- JWT con secret ≥ 32 caracteres (bloqueado por defecto en producción)
- bcrypt cost 12 para passwords y PINs
- Anti-fuerza-bruta (5 intentos → bloqueo 15 min)
- Rate limit global + estricto en `/auth/*`
- HMAC-SHA256 para webhooks WhatsApp
- CORS restringido al frontend autorizado
- Validación estricta de DTOs en cada endpoint

---

## Licencia

Software propietario · Admiral Wiskeria © 2026
