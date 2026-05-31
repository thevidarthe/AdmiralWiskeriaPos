# 🚀 DEPLOYMENT EN RAILWAY - INSTRUCCIONES EXACTAS

Sigue estos pasos **exactamente como están** para hacer el deploy en vivo.

---

## 📋 REQUISITOS PREVIOS

- [ ] Código en GitHub (public o private, no importa)
- [ ] Backend + Frontend compilando localmente
- [ ] Tests pasando (opcional pero recomendado)
- [ ] Dominio comprado (Namecheap, Porkbun, etc.)
- [ ] Cuenta de GitHub (para conectar con Railway)

---

## PASO 1: Crear Cuenta en Railway (5 min)

### 1.1 - Abre Railway

```
https://railway.app
```

### 1.2 - Sign Up

```
Click en "Sign Up"
├─ Opción: "Sign up with GitHub"
├─ Autoriza Railway a acceder a tu GitHub
└─ Conecta automáticamente
```

### 1.3 - Nuevo Proyecto

```
Railway Dashboard → Click "New Project"
```

---

## PASO 2: Conectar Repositorio GitHub (5 min)

### 2.1 - Seleccionar Repo

```
New Project → Deploy from GitHub repo
```

### 2.2 - Buscar Repository

```
Busca "admiral-pro" o similar
└─ Selecciona tu repo
```

### 2.3 - Autorizar

```
Click "Deploy from GitHub"
└─ Esperá a que termine el análisis
```

**Resultado esperado:**
```
Railway detecta automáticamente:
✓ Dockerfile en backend/
✓ Dockerfile en frontend/
✓ docker-compose.yml
```

---

## PASO 3: Agregar Servicios (10 min)

### 3.1 - Agregar PostgreSQL

```
Railway Dashboard → Tu proyecto
├─ Click "+ Add"
├─ Busca "PostgreSQL"
├─ Click "PostgreSQL"
└─ Espera a que se agregue (2-3 min)
```

**Verify:**
```
Debe aparecer en tu proyecto:
✓ postgres (container)
✓ Status: "deploying..." → "healthy"
```

### 3.2 - Agregar Redis

```
Railway Dashboard → Tu proyecto
├─ Click "+ Add"
├─ Busca "Redis"
├─ Click "Redis"
└─ Espera a que se agregue (2-3 min)
```

**Verify:**
```
Debe aparecer en tu proyecto:
✓ redis (container)
✓ Status: "deploying..." → "healthy"
```

---

## PASO 4: Configurar Variables de Entorno (10 min)

### 4.1 - Backend - Variables de Entorno

```
Railway → Backend Service → Variables (tab)
```

**Agrega estas variables exactamente:**

```
APP_ENV=production
APP_PORT=${{PORT}}
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_ADDR=${{Redis.REDIS_HOST}}:${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
JWT_SECRET=[generar_abajo]
FRONTEND_URL=https://admiral.tu-dominio.com
DEFAULT_TENANT_SLUG=admiral
DEFAULT_TENANT_NAME=Admiral Whiskería
LOG_LEVEL=info
LOG_FORMAT=json
```

**⚠️ JWT_SECRET - Genera uno seguro:**

Opción 1 (Windows PowerShell):
```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (New-Guid).ToString())) | Out-String
```

Opción 2 (Online):
1. Abre https://www.uuidgenerator.net/
2. Genera dos UUIDs
3. Cópialos y concatena: `UUID1+UUID2`

Opción 3 (OpenSSL si tienes instalado):
```bash
openssl rand -base64 64
```

**Usa el valor generado como JWT_SECRET**

### 4.2 - Frontend - Variables de Entorno

```
Railway → Frontend Service → Variables (tab)
```

**Agrega:**

```
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
NEXT_PUBLIC_APP_NAME=Admiral Pro
```

---

## PASO 5: Configurar Dominios Custom (5 min)

### 5.1 - Backend Custom Domain

```
Railway → Backend → Settings → Networking
├─ Busca "Custom Domain"
├─ Click "Add"
├─ Ingresa: api.tu-dominio.com
├─ Click "Add Custom Domain"
└─ Railway muestra: admiral-api.up.railway.app (CNAME value)
```

**Guarda este valor:** `admiral-api.up.railway.app`

### 5.2 - Frontend Custom Domain

```
Railway → Frontend → Settings → Networking
├─ Busca "Custom Domain"
├─ Click "Add"
├─ Ingresa: admiral.tu-dominio.com
├─ Click "Add Custom Domain"
└─ Railway muestra: admiral.up.railway.app (CNAME value)
```

**Guarda este valor:** `admiral.up.railway.app`

---

## PASO 6: Apuntar DNS en Registrador (5 min)

### 6.1 - Si tu dominio está en Namecheap

```
Namecheap Panel → Tu dominio → Advanced DNS
```

**Busca estos registros y reemplázalos:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | @ | admiral.up.railway.app | 3600 |
| CNAME | www | admiral.up.railway.app | 3600 |
| CNAME | api | admiral-api.up.railway.app | 3600 |

**Pasos exactos:**

1. Abre Namecheap → Dashboard → Tu dominio
2. Click "Manage"
3. Tab "Advanced DNS"
4. Busca registro `A` con `@` → Click eliminar (🗑️)
5. Busca registro `CNAME` con `www` → Click eliminar (🗑️)
6. Click "Add New Record"
   ```
   Type: CNAME Record
   Host: @
   Value: admiral.up.railway.app
   TTL: 3600
   Click Checkmark ✓
   ```
7. Click "Add New Record" nuevamente
   ```
   Type: CNAME Record
   Host: www
   Value: admiral.up.railway.app
   TTL: 3600
   Click Checkmark ✓
   ```
8. Click "Add New Record" nuevamente
   ```
   Type: CNAME Record
   Host: api
   Value: admiral-api.up.railway.app
   TTL: 3600
   Click Checkmark ✓
   ```

**Guarda cambios (Click Save)**

---

### 6.2 - Si tu dominio está en otro registrador

**Porkbun:**
```
Dominio → DNS Settings → Editar
[Mismo proceso que Namecheap]
```

**HostGator:**
```
cPanel → Zone Editor
[Mismo proceso]
```

**GoDaddy:**
```
Dominio → DNS → Editar records
[Mismo proceso]
```

---

## PASO 7: Esperar Propagación DNS (15 min - 24 horas)

**La propagación DNS toma tiempo:**

### Verificar que el DNS se propagó:

**Opción 1: Desde PowerShell**
```powershell
nslookup admiral.tu-dominio.com
nslookup api.tu-dominio.com

# Debe devolver las IPs de Railway
```

**Opción 2: Online**
```
Abre https://mxtoolbox.com/
├─ Click "Lookup DNS"
├─ Ingresa tu dominio
└─ Busca los CNAME records
```

**Opción 3: Esperá y prueba en el navegador**
```
https://admiral.tu-dominio.com
# Si carga → DNS propagó
```

---

## PASO 8: Testing en Vivo (10 min)

Una vez que el DNS se propagó:

### 8.1 - Health Check del Backend

```bash
curl https://api.tu-dominio.com/api/v1/health/ping
```

**Resultado esperado:**
```json
{
  "status": "ok"
}
```

Si ves error `Connection refused` → Esperá más, aún no propagó DNS.

### 8.2 - Frontend Carga

```
Abre en navegador: https://admiral.tu-dominio.com
```

**Deberías ver:**
- Logo de Admiral
- Pantalla de login
- Campo de usuario + PIN

### 8.3 - Flujo POS Completo

**1. Login**
```
Usuario: admin (o disponible)
PIN: 0000 (o el pin del usuario)
Click: Ingresar
```

**2. Acceder a POS**
```
Sidebar → POS
```

**3. Agregar producto**
```
Click en producto (ej: "Corona")
├─ Se agrega al carrito
├─ Cantidad se muestra
└─ Total se recalcula
```

**4. Checkout**
```
Click "Procesar Venta"
├─ Resumen de venta aparece
├─ Método pago: selecciona uno
├─ Click "Confirmar Pago"
└─ ✅ Venta registrada
```

### 8.4 - Verificar en Admin

```
Admin → Reportes
├─ Venta de hace momentos debe aparecer
├─ Total debe ser correcto
└─ Productos deben estar listados
```

---

## PASO 9: Monitoreo Continuo (Después del Deploy)

### 9.1 - Railway Metrics

```
Railway → Backend → Metrics
├─ Response Time (target: < 200ms)
├─ Error Rate (target: 0%)
├─ Memory Usage (target: < 512MB)
└─ CPU (target: < 50%)
```

### 9.2 - Logs en Tiempo Real

```
Railway → Backend → Logs
├─ Busca errores
├─ Busca "ERROR", "FATAL"
└─ Filtra por timestamp
```

### 9.3 - Database Backup

```
Railway → PostgreSQL → Backups
├─ Backups automáticos: cada 24h
├─ Retención: 7 días
└─ Puedes hacer restore si es necesario
```

---

## PASO 10: Troubleshooting

| Problema | Solución |
|----------|----------|
| `502 Bad Gateway` | Backend no responde. Revisar logs en Railway |
| `CORS error en frontend` | `FRONTEND_URL` incorrecta. Revisar env var Backend |
| `Cannot connect to database` | Esperar a que PostgreSQL health check pase. Ver Railway logs |
| `Login no funciona` | JWT_SECRET diferente. Debe ser igual en dev y prod |
| `Productos no cargan` | Backend no se conecta a BD. Ver logs |
| `DNS no resuelve` | Esperar 15-24h a que propague. Verificar con `nslookup` |

---

## ✅ CHECKLIST FINAL

Antes de marcar "completado":

- [ ] Cuenta Railway creada
- [ ] Repo GitHub conectado
- [ ] PostgreSQL agregado (healthy)
- [ ] Redis agregado (healthy)
- [ ] Backend variables configuradas
- [ ] Frontend variables configuradas
- [ ] Dominios custom agregados en Railway
- [ ] Registros DNS creados en registrador
- [ ] DNS propagado (verificado con nslookup)
- [ ] Health check responde (API)
- [ ] Frontend carga (https://admiral.tu-dominio.com)
- [ ] Flujo POS completo funciona
- [ ] Venta aparece en reportes
- [ ] Logs sin errores críticos
- [ ] Backups automáticos habilitados

---

## 🎉 ¡LISTO!

Tu Admiral Pro está en **VIVO** en:
```
Frontend: https://admiral.tu-dominio.com
Backend: https://api.tu-dominio.com
Base de datos: Railway PostgreSQL (encrypted, backups automáticos)
```

**Próximos pasos:**
1. Invita a staff para que usen el sistema
2. Monitorea logs y métricas
3. Configura alertas en Railway
4. Integra WhatsApp Business (próximo)
5. Realiza backups adicionales en Google Drive

---

## 🆘 ¿Necesitas ayuda?

Si algo no funciona:

1. **Revisar logs en Railway:**
   ```
   Railway → Tu servicio → Logs
   └─ Busca message "ERROR"
   ```

2. **Verificar variables de entorno:**
   ```
   Railway → Backend → Variables
   └─ Confirma que todas estén presentes
   ```

3. **Reconectar repositorio:**
   ```
   Railway → Settings → Redeploy
   └─ Click "Redeploy"
   ```

4. **Resetear todo:**
   ```
   Railway → Settings → Delete Project
   └─ Volver a empezar (NO recomendado sin backup)
   ```

---

**Document version:** 1.0  
**Last updated:** 2026-05-22  
**Tested with:** Railway, Namecheap, Admiral Pro v1
