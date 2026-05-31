# 🚀 GUÍA COMPLETA: DEPLOYMENT EN VIVO + VERIFICACIÓN UI

**Admiral Pro - Sistema POS para Bar/Whiskería**

---

## 📊 ARQUITECTURA DEL SISTEMA (Dónde queda todo)

```
                           USUARIO FINAL
                                ↓
                    ┌─────────────────────────┐
                    │   FRONTEND (Next.js)    │
                    │  admiral.tu-dominio.com │
                    │                         │
                    │ • Login PIN             │
                    │ • POS Interface         │
                    │ • Admin Panel           │
                    │ • QR Client             │
                    │ • PWA Instalable        │
                    └────────────┬────────────┘
                                 │ HTTPS
                    ┌────────────▼────────────┐
                    │   BACKEND (Go API)      │
                    │ api.tu-dominio.com      │
                    │                         │
                    │ • /api/v1/auth/*        │
                    │ • /api/v1/pos/*         │
                    │ • /api/v1/menu/*        │
                    │ • /api/v1/crm/*         │
                    │ • /api/v1/reports/*     │
                    │ • /api/v1/whatsapp/*    │
                    └────────────┬────────────┘
                                 │ SQL
                    ┌────────────┼────────────┐
                    │            │            │
         ┌──────────▼─────────────▼──────────▼──────────┐
         │       RAILWAY CLOUD INFRASTRUCTURE           │
         ├─────────────────────────────────────────────┤
         │ PostgreSQL 16          | Redis 7             │
         │ ├─ admiral_pro         | ├─ cola WhatsApp   │
         │ ├─ users              | ├─ rate limiting   │
         │ ├─ sales              | ├─ cache auth      │
         │ ├─ products           |                    │
         │ ├─ customers          | Backups automáticos │
         │ ├─ inventory          | Encrypted          │
         │ ├─ branches           |                    │
         │ └─ [todas tablas]     |                    │
         └──────────────────────────────────────────────┘
```

---

## 🎨 FLUJOS DE UI - MAPA COMPLETO

### 1️⃣ PANTALLA DE LOGIN
```
[Login PIN]
├─ Seleccionar usuario de lista
├─ Ingresar PIN de 4 dígitos
├─ Validación contra backend
└─ Redirección según rol:
   ├─ ADMIN/MANAGER → /admin
   ├─ BARISTA/CASHIER → /pos
   └─ WAITER → /mesero
```

**Verificar:**
- ✅ Cargan usuarios disponibles
- ✅ PIN bloqueado después de 5 intentos (15 min)
- ✅ JWT se guarda en localStorage
- ✅ Sesión persiste tras refresh

---

### 2️⃣ FLUJO POS (PUNTO DE VENTA) ⭐ CRÍTICO
```
[POS INTERFACE]
     ↓
[Seleccionar Categoría]
     ↓
[Grid de Productos]
 ├─ Search en tiempo real
 └─ Click en producto
     ↓
[CARRITO DINÁMICO]
 ├─ Agregar a carrito
 ├─ Ajustar cantidad (-, +)
 ├─ Eliminar ítem
 ├─ Mostrar subtotal
 └─ Cálculo automático
     ↓
[CHECKOUT]
 ├─ Resumen de venta
 ├─ Método pago (efectivo, tarjeta, etc)
 ├─ Procesar venta
 └─ Generar recibo
     ↓
[CONFIRMACIÓN]
 ├─ ✅ Venta registrada
 ├─ Carrito limpio
 └─ Listo para nueva venta
```

**Movimientos a verificar:**
- ✅ Agregar producto → carrito se actualiza en tiempo real
- ✅ Cambiar cantidad → total recalcula automáticamente
- ✅ Remover item → se elimina del carrito
- ✅ Checkout → sale se registra en BD con timestamp
- ✅ Recibo genera correctamente
- ✅ Carrito se limpia automáticamente

---

### 3️⃣ PANEL ADMIN - MÓDULOS

```
[ADMIN SIDEBAR]
├─ 📊 Dashboard
│  ├─ KPIs hoy (ventas, ticket promedio)
│  ├─ Gráficos de tendencia
│  └─ Últimas transacciones
│
├─ 🛒 Gestión de Productos
│  ├─ Crear producto nuevo
│  ├─ Editar precio/nombre/descripción
│  ├─ Eliminar producto
│  └─ Filtrar por categoría
│
├─ 🏷️ Categorías
│  ├─ CRUD de categorías
│  └─ Asignar productos a categoría
│
├─ 👥 Clientes (CRM)
│  ├─ Listado de clientes
│  ├─ Historial de compras
│  ├─ Puntos de lealtad
│  └─ Nivel (VIP, Regular, etc)
│
├─ 📦 Inventario
│  ├─ Stock por producto
│  ├─ Alertas de bajo stock
│  ├─ Movimientos (entrada/salida)
│  └─ Conteo físico
│
├─ 🔗 QR de Mesas
│  ├─ Generar QR para mesa
│  ├─ Asignar mesa a sucursal
│  └─ Desactivar QR
│
├─ 📢 Promociones
│  ├─ Crear descuentos
│  ├─ Asignar a productos
│  └─ Validez temporal
│
├─ 📈 Reportes
│  ├─ Cierre diario
│  ├─ Ventas por mes
│  ├─ Análisis de productos
│  ├─ Reportes por usuario
│  └─ Exportar a Excel
│
├─ 👨‍💼 Usuarios
│  ├─ Crear usuario + PIN
│  ├─ Asignar rol
│  ├─ Activar/desactivar
│  └─ Cambiar contraseña
│
├─ ⚙️ Configuración
│  ├─ Datos de sucursal
│  ├─ Integración WhatsApp
│  ├─ Configuración de caja
│  └─ Horarios de operación
│
└─ 🚪 Salir (Logout)
```

**Movimientos a verificar en Admin:**
- ✅ Crear producto → aparece en POS
- ✅ Cambiar precio → se refleja en ventas nuevas
- ✅ Crear categoría → se muestra en filtro POS
- ✅ Crear cliente → se vincula a ventas
- ✅ Generar QR → código escaneables en mesas
- ✅ Crear reporte → exporta datos correctamente
- ✅ Cambiar permiso usuario → rol se aplica inmediatamente

---

### 4️⃣ FLUJO QR - CLIENTE EN MESA
```
[Cliente en mesa]
     ↓
[Escanea QR → /qr/[token]]
     ↓
[Menú Digital en Navegador]
 ├─ Listado de productos
 ├─ Descripción + foto
 ├─ Añadir al carrito
 └─ Llamar a mesero
     ↓
[Confirmar pedido]
     ↓
[Mesero recibe notificación]
```

**Movimientos a verificar:**
- ✅ QR redirecciona a URL correcta
- ✅ Menú carga sin login
- ✅ Cliente puede agregar a carrito
- ✅ Botón "Llamar mesero" notifica al staff
- ✅ Pedido aparece en cocina/bar

---

### 5️⃣ PANEL MESERO
```
[Mesero Dashboard]
├─ Mesas activas (ocupadas)
├─ Órdenes pendientes
├─ Llamadas de clientes (QR)
├─ Marcar orden completada
└─ Generar recibo
```

---

## 🔧 BASE DE DATOS - UBICACIÓN EN VIVO

### 📍 Servidor: **RAILWAY POSTGRES**

| Componente | Ubicación | Detalles |
|-----------|-----------|---------|
| **PostgreSQL** | Railway cloud | Automático, backups diarios, encrypted |
| **Redis** | Railway cloud | Para cola WhatsApp y rate limiting |
| **URL Conexión** | `${Postgres.DATABASE_URL}` | Inyectada por Railway |
| **Backups** | Railway automático | 7 días de retención |
| **Acceso** | Restringido a backend | IP whitelisted |

### Tablas principales en PostgreSQL:

```sql
-- Datos de administración
├─ tenants (multi-tenant)
├─ users (staff con roles)
├─ branches (sucursales)
│
-- Operación
├─ sales (ventas diarias) ⭐
├─ sale_items (items por venta)
├─ products (catálogo)
├─ categories (agrupación)
│
-- Cliente
├─ customers (CRM)
├─ loyalty_points (puntos)
├─ purchase_history (historial)
│
-- Inventario
├─ stock (cantidad disponible)
├─ stock_movements (entrada/salida)
│
-- Configuración
├─ promotions (descuentos)
├─ qr_codes (mesas)
├─ whatsapp_config (integración)
```

**Acceso desde el backend:**
```go
// Go code ejecutándose en Railway
db.Where("tenant_id = ?", tenantId).Find(&sales)
// Se conecta automáticamente a Railway PostgreSQL
```

---

## 🚀 PASOS PARA HACER EL LIVE

### PASO 1: Validación Local (10 minutos)

```bash
# 1. Levanta infraestructura
cd admiral-pro
docker compose up -d

# 2. Verifica que PostgreSQL + Redis estén OK
docker compose ps
# Debe mostrar: postgres, redis, backend (all healthy)

# 3. Corre backend
cd backend
go run ./cmd/api

# 4. En otra terminal, corre frontend
cd frontend
npm run dev

# 5. Abre http://localhost:3000
# Deberías ver la pantalla de Login
```

**Checks locales:**
- ✅ Backend arranca sin errores
- ✅ Frontend carga en http://localhost:3000
- ✅ Base de datos postgres tiene datos
- ✅ Redis está disponible

---

### PASO 2: Preparar Variables de Entorno (5 minutos)

Necesitas generar un `JWT_SECRET` seguro:

```bash
# En PowerShell (Windows)
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString())) | Out-String
```

O online: https://www.uuidgenerator.net/ (copia 2 UUIDs y concatena)

Guarda este valor, lo necesitarás en Railway.

---

### PASO 3: Crear Cuenta en Railway (5 minutos)

1. **Abre** https://railway.app
2. **Sign up** con GitHub (recomendado)
3. **Autoriza** Railway a acceder a tu GitHub
4. **Click** "New Project"

---

### PASO 4: Deployar a Railway (20 minutos)

#### 4.1 - Conectar repositorio GitHub

```
Railway → New Project → Deploy from GitHub repo
  ↓
Selecciona el repo: admiral-pro
  ↓
Railway detecta docker-compose.yml automáticamente
```

#### 4.2 - Agregar servicios

```
Railway Dashboard → Add Service
  ├─ Backend (Lee Dockerfile de backend/)
  ├─ Frontend (Lee Dockerfile de frontend/)
  ├─ PostgreSQL (plugin, 1 clic)
  └─ Redis (plugin, 1 clic)
```

#### 4.3 - Configurar Variables de Entorno

En **Railway → Backend → Variables**:

```
APP_ENV=production
APP_PORT=${{PORT}}
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_ADDR=${{Redis.REDIS_HOST}}:${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
JWT_SECRET=[tu_jwt_secret_seguro_generado_aquí]
FRONTEND_URL=https://admiral.tu-dominio.com
DEFAULT_TENANT_SLUG=admiral
DEFAULT_TENANT_NAME=Admiral Whiskería
LOG_LEVEL=info
LOG_FORMAT=json
```

En **Railway → Frontend → Variables**:

```
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
NEXT_PUBLIC_APP_NAME=Admiral Pro
```

---

### PASO 5: Apuntar Dominio (10 minutos)

#### 5.1 - En Railway, obtén URLs custom

```
Railway Dashboard → Backend → Settings → Networking
  ├─ Agrega custom domain: api.tu-dominio.com
  └─ Railway te muestra: admiral-api.up.railway.app (CNAME)

Railway Dashboard → Frontend → Settings → Networking
  ├─ Agrega custom domain: admiral.tu-dominio.com
  └─ Railway te muestra: admiral.up.railway.app (CNAME)
```

#### 5.2 - En tu Registrador de Dominio (Namecheap/Porkbun/etc)

Panel de Control → DNS Zone Editor

Reemplaza registros existentes con:

```
Type    Name    Value                    TTL
─────   ─────   ──────────────────────   ─────
CNAME   @       admiral.up.railway.app   3600
CNAME   www     admiral.up.railway.app   3600
CNAME   api     admiral-api.up.railway.app 3600
```

**Guardar y esperar propagación (15 min - 24 horas).**

Verifica con:
```bash
nslookup admiral.tu-dominio.com
# Debe devolver la IP de Railway
```

---

### PASO 6: Testing en Vivo (15 minutos)

Una vez que el dominio propague:

#### ✅ Test 1: Backend responde
```bash
curl https://api.tu-dominio.com/api/v1/health/ping
# Esperado: { "status": "ok" }
```

#### ✅ Test 2: Frontend carga
```
Abre https://admiral.tu-dominio.com en navegador
# Deberías ver la pantalla de Login
```

#### ✅ Test 3: Flujo POS completo

1. **Login**
   - Selecciona usuario
   - Ingresa PIN
   - ✅ Deberías entrar al sistema

2. **POS**
   - Click en "POS"
   - ✅ Carga listado de productos
   - Selecciona un producto
   - ✅ Se agrega al carrito
   - Presiona "+" para aumentar cantidad
   - ✅ Cantidad aumenta y total recalcula
   - Click en "Checkout"
   - ✅ Venta se registra en BD
   - ✅ Recibes confirmación

3. **Admin Panel**
   - Click en "Admin"
   - ✅ Ves dashboard con KPIs
   - Accede a "Productos"
   - ✅ Ves listado de productos
   - Accede a "Reportes"
   - ✅ Ves venta que acabas de hacer

4. **QR de Mesa**
   - En Admin → QR
   - Genera código QR
   - Escanea con teléfono
   - ✅ Abre menú digital en /qr/[token]

---

## 📊 MONITOREO DESPUÉS DEL DEPLOY

### Railway Dashboard - Métricas en Vivo

```
Railway → Backend → Metrics
├─ Response Time (target: <200ms)
├─ Request Rate (requests/min)
├─ Error Rate (target: 0%)
├─ Memory Usage (target: <512MB)
├─ CPU Usage
└─ Logs (en tiempo real)
```

### Alertas a configurar

```
Railway → Backend → Settings → Notifications
├─ Email cuando Build falla
├─ Email cuando Deploy tiene error
├─ Email cuando Health Check falla
└─ Slack (opcional)
```

### Healthcheck automático

Railway monitorea: `GET /api/v1/health/ping` cada 30 segundos

Si falla 3 veces → Re-deploy automático

---

## 🐛 TROUBLESHOOTING

| Síntoma | Causa Probable | Solución |
|---------|---|---|
| `502 Bad Gateway` | Backend no responde | Revisar logs en Railway |
| `CORS error` | `FRONTEND_URL` incorrecta | Editar env var en Railway |
| `Database connection refused` | `DATABASE_URL` incorrecta | Regenerar PostgreSQL addon |
| `Login no funciona` | JWT_SECRET diferente en prodvs dev | Verificar env vars |
| `Productos no cargan` | Backend no se conecta a BD | Esperar healthcheck |
| `404 Not Found` | Path incorrecto en frontend | Revisar NEXT_PUBLIC_API_URL |

---

## 📈 PRÓXIMOS PASOS

### Inmediatos
- [ ] Crear cuenta Railway
- [ ] Deploy backend + frontend
- [ ] Apuntar dominio
- [ ] Testing completo

### Corto plazo (1-2 semanas)
- [ ] Integración WhatsApp Business (campañas)
- [ ] Webhooks de venta → WhatsApp
- [ ] Backup automático a Google Drive/AWS
- [ ] Logs centralizados (LogRocket, Sentry)

### Mediano plazo (1-3 meses)
- [ ] Kitchen Display System (KDS)
- [ ] Análisis avanzado de ventas
- [ ] Promociones inteligentes (por cliente)
- [ ] Dashboard de gerencia

---

## 📞 SOPORTE

Si algo no funciona:

1. **Revisar logs en Railway**
   ```
   Railway Dashboard → Logs → Filter por error message
   ```

2. **Conectar con base de datos en vivo**
   ```
   Railway → PostgreSQL → Connect → Use provided URL
   ```

3. **Resetear todo**
   ```
   Railway → Redeploy all → Force new build
   ```

---

**¡Listo! Tu Admiral Pro está en vivo.** 🎉

Próximo paso: ¿Necesitas ayuda con algún punto específico?
