#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Admiral Pro — setup local en una sola ejecución
# ═══════════════════════════════════════════════════════════
set -e

C_GOLD='\033[0;33m'
C_GREEN='\033[0;32m'
C_RED='\033[0;31m'
C_OFF='\033[0m'

echo -e "${C_GOLD}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║   Admiral Pro — Setup v2.0                    ║"
echo "  ║   POS + CRM + Inventario + WhatsApp + QR     ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${C_OFF}"

# ── Prerequisitos ──
command -v docker >/dev/null 2>&1 || { echo -e "${C_RED}✗ Docker no encontrado. Instala Docker Desktop.${C_OFF}"; exit 1; }
command -v go >/dev/null 2>&1     || { echo -e "${C_RED}✗ Go no encontrado. Instala Go 1.22+.${C_OFF}"; exit 1; }
command -v node >/dev/null 2>&1   || { echo -e "${C_RED}✗ Node no encontrado. Instala Node 20+.${C_OFF}"; exit 1; }

echo -e "${C_GREEN}✓ Docker $(docker --version | cut -d',' -f1 | cut -d' ' -f3)${C_OFF}"
echo -e "${C_GREEN}✓ Go $(go version | cut -d' ' -f3)${C_OFF}"
echo -e "${C_GREEN}✓ Node $(node -v)${C_OFF}"

# ── 1. PostgreSQL + Redis ──
echo -e "\n${C_GOLD}[1/5] Levantando PostgreSQL y Redis…${C_OFF}"
docker compose up -d postgres redis
echo -e "${C_GREEN}✓ BD y caché listos${C_OFF}"

# ── 2. .env ──
echo -e "\n${C_GOLD}[2/5] Generando .env…${C_OFF}"
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  # Generar JWT_SECRET aleatorio
  JWT=$(openssl rand -base64 48 | tr -d '\n')
  sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=${JWT}|" backend/.env && rm backend/.env.bak
  echo -e "${C_GREEN}✓ backend/.env creado (JWT_SECRET aleatorio)${C_OFF}"
else
  echo -e "${C_GREEN}✓ backend/.env ya existe${C_OFF}"
fi

if [ ! -f frontend/.env.local ] && [ -d frontend ]; then
  cp frontend/.env.example frontend/.env.local 2>/dev/null || true
  echo -e "${C_GREEN}✓ frontend/.env.local creado${C_OFF}"
fi

# ── 3. Dependencias backend ──
echo -e "\n${C_GOLD}[3/5] Instalando deps de Go…${C_OFF}"
(cd backend && go mod download)
echo -e "${C_GREEN}✓ Go modules listos${C_OFF}"

# ── 4. Migrar + seed ──
echo -e "\n${C_GOLD}[4/5] Aplicando migraciones + seed…${C_OFF}"
sleep 2  # esperar postgres
(cd backend && go run ./cmd/migrate up && go run ./cmd/seed)
echo -e "${C_GREEN}✓ BD inicializada${C_OFF}"

# ── 5. Dependencias frontend ──
if [ -d frontend ]; then
  echo -e "\n${C_GOLD}[5/5] Instalando deps del frontend…${C_OFF}"
  (cd frontend && npm install)
  echo -e "${C_GREEN}✓ Frontend listo${C_OFF}"
fi

echo -e "\n${C_GOLD}"
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║          Admiral Pro lista para operar             ║"
echo "  ╠═══════════════════════════════════════════════════╣"
echo "  ║ Terminal 1:  cd backend  && go run ./cmd/api      ║"
echo "  ║ Terminal 2:  cd frontend && npm run dev           ║"
echo "  ║                                                    ║"
echo "  ║ Acceso:      http://localhost:3000                ║"
echo "  ║ API:         http://localhost:4000/api/v1         ║"
echo "  ║                                                    ║"
echo "  ║ Usuarios demo:                                     ║"
echo "  ║   admin@admiral.co  / Admiral2026!  / PIN 1234    ║"
echo "  ║   barista@admiral.co/ Barista2026!  / PIN 1111    ║"
echo "  ║   mesero@admiral.co / Mesero2026!   / PIN 2222    ║"
echo "  ║   cajero@admiral.co / Cajero2026!   / PIN 3333    ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo -e "${C_OFF}"
