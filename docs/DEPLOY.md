# Despliegue de Admiral Pro

Guía para llevar Admiral Pro a producción con un dominio propio.

---

## TL;DR (resumen)

| Componente | Recomendación |
| --- | --- |
| Hosting backend + frontend + BD | Railway (~$19/mes) |
| Dominio | Donde quieras (HostGator, Namecheap, etc.) |
| DNS | Donde compraste el dominio |
| SSL | Automático en Railway |

---

## 1. Por qué no recomendamos hosting compartido

Hosting compartido (HostGator Hatchling/Baby/Business, Bluehost básico, GoDaddy
shared) **no funciona** para Admiral Pro porque la app requiere:

- Ejecutar un binario Go en background (puerto 4000)
- Node.js 20+ corriendo Next.js en SSR (puerto 3000)
- PostgreSQL 16 (no MySQL)
- Redis
- WebSockets para mesas en vivo
- Procesos 24/7 (no por petición)

El hosting compartido solo permite PHP + MySQL en CGI por petición.

---

## 2. Opciones recomendadas

### 🥇 Railway (recomendado)

| Concepto | Costo/mes |
| --- | --- |
| Backend Go | ~$5 |
| Frontend Next.js | ~$5 |
| PostgreSQL | ~$5 |
| Redis | ~$3 |
| **Total** | **~$19** |

**Ventajas:**
- Deploy automático con `git push`
- SSL automático de CA reconocida (Railway / Let's Encrypt)
- No uses certificados autofirmados en producción
- Logs y métricas integrados
- Backups automáticos diarios de Postgres
- Variables de entorno seguras
- Healthcheck integrado (ya configurado en `railway.json`)

**Setup:**

1. Push del código a GitHub
2. En railway.app → **New Project → Deploy from GitHub repo**
3. Railway detecta `railway.json` automáticamente
4. Agregar plugins **PostgreSQL** y **Redis** (1 clic cada uno)
5. Variables de entorno necesarias (Railway las inyecta donde lleva el placeholder `${{}}`):

   ```
   APP_ENV=production
   APP_PORT=${{PORT}}
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_ADDR=${{Redis.REDIS_HOST}}:${{Redis.REDIS_PORT}}
   REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
   JWT_SECRET=<generar con: openssl rand -base64 64>
   FRONTEND_URL=https://admiralwhiskeria.com
   DEFAULT_TENANT_SLUG=admiral
   DEFAULT_TENANT_NAME=Admiral Whiskería
   LOG_LEVEL=info
   LOG_FORMAT=json
   ```

6. Las migraciones SQL corren automáticamente en cada deploy (`./admiral-migrate up` está en `startCommand`).
7. Configura el dominio custom (sección 4 de este doc).

### 🥈 Render

Similar a Railway, $25-30/mes. También soporta deploy con git, SSL automático,
Postgres incluido. Buena alternativa si Railway tiene problemas.

### 🥉 Vercel + Neon + Upstash

- **Vercel** para frontend Next.js (gratis hasta 100 GB/mes de tráfico)
- **Neon** para PostgreSQL serverless (gratis hasta 0.5 GB)
- **Upstash** para Redis serverless (gratis hasta 10k requests/día)
- Backend Go necesitarías ponerlo en Railway o Fly.io

Más fragmentado pero puede ser casi gratis para volumen bajo. ~$15/mes a escala.

### ⚠️ HostGator VPS Snappy / Cloud

Funciona pero requiere configuración manual completa. Solo recomendado si ya
tienes experiencia administrando servidores Linux. Ver sección 5 si insistes.

---

## 3. Dominio: dónde comprarlo

| Proveedor | `.com` USD/año | Pros |
| --- | --- | --- |
| Namecheap | ~$10 | Más barato + WHOIS privacy gratis |
| Porkbun | ~$10 | Más barato del mercado |
| Cloudflare Registrar | ~$9 | Precio al costo, requiere CF DNS |
| HostGator | ~$15 | Si ya estás ahí |
| GoDaddy | ~$13 | Conocido pero más caro |

> Para Colombia, **un .co cuesta más** (~$25-35/año). Usa `.com` si quieres precio internacional.

---

## 4. Apuntar tu dominio a Railway

### 4.1 — Si el dominio está en HostGator

**Asumiendo que tu app está en Railway:**

1. En **Railway** → tu servicio Frontend → **Settings → Networking → Custom Domain**:
   - Agrega `admiralwhiskeria.com`
   - Railway te muestra el valor del DNS a configurar (será un CNAME o A)
   - Repite para `www.admiralwhiskeria.com`
2. En **Railway** → tu servicio Backend → **Settings → Networking → Custom Domain**:
   - Agrega `api.admiralwhiskeria.com`
3. En **HostGator cPanel** → **DNS Zone Editor**:

   Borra los registros viejos que apunten a HostGator (suelen ser:
   `A @ → 192.X.X.X` y `CNAME www → gator.hostgator.com`).

   Agrega los nuevos:

   ```
   Type    Name    Value                              TTL
   ─────   ─────   ─────────────────────────────────  ──────
   CNAME   @       admiral.up.railway.app             3600
   CNAME   www     admiral.up.railway.app             3600
   CNAME   api     admiral-api.up.railway.app         3600
   ```

   > Si HostGator no permite CNAME en `@`, usa **ALIAS/ANAME** si está disponible, o **A** con la IP que Railway te muestra.

4. **Guarda**. Propagación: 15 min a 24h.
5. Verifica:
   ```bash
   nslookup admiralwhiskeria.com
   curl -I https://admiralwhiskeria.com
   ```
6. **Actualiza la env var `FRONTEND_URL` en Railway** al dominio final:
   ```
   FRONTEND_URL=https://admiralwhiskeria.com,https://www.admiralwhiskeria.com
   ```
7. **Actualiza la env var `NEXT_PUBLIC_API_URL` en el frontend de Railway**:
   ```
   NEXT_PUBLIC_API_URL=https://api.admiralwhiskeria.com/api/v1
   ```
8. Redeploya ambos servicios.

### 4.2 — Errores típicos

- **"No es seguro"** → SSL aún no se emitió. Espera 5-10 min después de agregar
  el dominio en Railway.
- **CORS error en consola del navegador** → no actualizaste `FRONTEND_URL` en el
  backend, o no incluiste el `www`.
- **El frontend carga pero el login falla** → no actualizaste
  `NEXT_PUBLIC_API_URL` en el frontend.
- **DNS no resuelve después de 1h** → algunos registradores requieren reiniciar
  la zona DNS o tienen TTL altos. Espera hasta 24h.

---

## 5. Solo si insistes en HostGator VPS (Snappy)

### Requisitos

- Plan **Snappy 2000** ($30/mes) o superior
- Acceso SSH habilitado
- IP pública

### Setup paso a paso

```bash
# 1. SSH al servidor
ssh root@tu-ip-hostgator

# 2. Actualizar sistema
apt update && apt upgrade -y

# 3. Instalar dependencias
apt install -y curl wget git nginx postgresql-16 redis-server certbot python3-certbot-nginx ufw

# 4. Instalar Go 1.22
wget https://go.dev/dl/go1.22.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.22.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
source /etc/profile

# 5. Instalar Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash
apt install -y nodejs

# 6. Configurar Postgres
sudo -u postgres psql <<EOF
CREATE DATABASE admiral_pro;
CREATE USER admiral WITH ENCRYPTED PASSWORD 'CAMBIA_ESTO_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE admiral_pro TO admiral;
EOF

# 7. Configurar Redis password
sed -i 's/# requirepass foobared/requirepass CAMBIA_ESTO_password_redis/' /etc/redis/redis.conf
systemctl restart redis

# 8. Clonar el código
mkdir -p /opt/admiral
cd /opt/admiral
git clone https://github.com/TU_USUARIO/admiral-pro.git .

# 9. Build backend
cd backend
cp .env.example .env
nano .env  # editar todas las variables
go mod download
go build -o /opt/admiral/bin/admiral-api ./cmd/api
go build -o /opt/admiral/bin/admiral-migrate ./cmd/migrate
go build -o /opt/admiral/bin/admiral-seed ./cmd/seed
./bin/admiral-migrate up
./bin/admiral-seed

# 10. Build frontend
cd ../frontend
cp .env.example .env.local
nano .env.local  # NEXT_PUBLIC_API_URL=https://api.admiralwhiskeria.com/api/v1
npm ci
npm run build

# 11. Crear systemd units
cat > /etc/systemd/system/admiral-api.service <<EOF
[Unit]
Description=Admiral Pro API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/admiral/backend
EnvironmentFile=/opt/admiral/backend/.env
ExecStart=/opt/admiral/bin/admiral-api
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/admiral-web.service <<EOF
[Unit]
Description=Admiral Pro Frontend
After=network.target admiral-api.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/admiral/frontend
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable admiral-api admiral-web
systemctl start admiral-api admiral-web

# 12. Configurar Nginx
cat > /etc/nginx/sites-available/admiral <<EOF
server {
    listen 80;
    server_name admiralwhiskeria.com www.admiralwhiskeria.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
server {
    listen 80;
    server_name api.admiralwhiskeria.com;
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -s /etc/nginx/sites-available/admiral /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 13. Firewall
ufw allow 22 80 443
ufw enable

# 14. SSL con Let's Encrypt
certbot --nginx -d admiralwhiskeria.com -d www.admiralwhiskeria.com -d api.admiralwhiskeria.com

# Renovación automática
echo "0 3 * * * root certbot renew --quiet" >> /etc/crontab
```

**Después de esto, apuntas el DNS en HostGator a la IP del VPS:**

```
A    @     <ip-del-vps>
A    www   <ip-del-vps>
A    api   <ip-del-vps>
```

### Mantenimiento manual con HostGator VPS

- Actualizar Linux: `apt update && apt upgrade` semanal
- Backups Postgres:
  ```bash
  # En /etc/crontab
  0 2 * * * root pg_dump admiral_pro | gzip > /backups/$(date +\%F).sql.gz
  ```
- Logs: `journalctl -u admiral-api -f` y `journalctl -u admiral-web -f`
- Deploy de cambios:
  ```bash
  cd /opt/admiral && git pull
  cd backend && go build -o /opt/admiral/bin/admiral-api ./cmd/api && systemctl restart admiral-api
  cd ../frontend && npm ci && npm run build && systemctl restart admiral-web
  ```

---

## 6. Checklist post-deploy

- [ ] Login funciona con usuarios del seed
- [ ] Cambiar inmediatamente las contraseñas/PINs de los usuarios demo desde
      `/admin/configuracion`
- [ ] Generar JWT_SECRET nuevo en producción (`openssl rand -base64 64`)
- [ ] Verificar `/api/v1/health/ping` desde el frontend (debe responder 200)
- [ ] Configurar backups automáticos (Railway lo hace solo; en VPS, cron)
- [ ] Probar el flujo: login → POS → abrir mesa → cobrar
- [ ] Probar QR público en `/qr/<token>`
- [ ] Configurar GitHub Actions `RAILWAY_TOKEN` para deploy automático
- [ ] (Opcional) Configurar WhatsApp Business (cambiar `WHATSAPP_ENABLED=true`
      y agregar credenciales de Meta)

---

## 7. Recursos

- Railway docs: https://docs.railway.app/
- Let's Encrypt: https://letsencrypt.org/
- Cloudflare DNS (alternativa premium gratis): https://www.cloudflare.com/
- Estado de servicios: https://status.railway.app/
