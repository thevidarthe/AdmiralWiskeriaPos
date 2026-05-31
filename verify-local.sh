#!/bin/bash
# ════════════════════════════════════════════════════════════
# Admiral Pro - Script de Verificación de Flujos Locales
# ════════════════════════════════════════════════════════════
#
# Uso: ./verify-local.sh
# 
# Este script verifica que todos los componentes estén listos
# antes de hacer el deploy en vivo

set -e

echo "🚀 Iniciando verificación de Admiral Pro..."
echo ""

# ════════════════════════════════════════════════════════════
# PASO 1: Verificar Docker
# ════════════════════════════════════════════════════════════
echo "1️⃣  Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    exit 1
fi
echo "✅ Docker está instalado"
echo ""

# ════════════════════════════════════════════════════════════
# PASO 2: Verificar Docker Compose Services
# ════════════════════════════════════════════════════════════
echo "2️⃣  Levantando servicios Docker (PostgreSQL + Redis)..."
docker compose up -d 2>/dev/null || {
    echo "❌ Error levantando docker-compose"
    exit 1
}
sleep 3

# Verificar PostgreSQL
if docker compose ps postgres | grep -q "healthy"; then
    echo "✅ PostgreSQL está healthy"
else
    echo "⚠️  Esperando a PostgreSQL..."
    sleep 5
fi

# Verificar Redis
if docker compose ps redis | grep -q "healthy"; then
    echo "✅ Redis está healthy"
else
    echo "⚠️  Esperando a Redis..."
    sleep 5
fi
echo ""

# ════════════════════════════════════════════════════════════
# PASO 3: Verificar Backend Go
# ════════════════════════════════════════════════════════════
echo "3️⃣  Verificando Backend Go..."
cd backend

if ! command -v go &> /dev/null; then
    echo "❌ Go no está instalado"
    exit 1
fi
echo "✅ Go está instalado"

# Verificar que se puede hacer build
echo "   Compilando backend..."
if ! go build -o admiral-api ./cmd/api 2>/dev/null; then
    echo "❌ Error compilando backend"
    exit 1
fi
echo "✅ Backend compilado correctamente"

# Verificar migraciones
if [ -d "migrations" ]; then
    migration_count=$(ls migrations/*.up.sql 2>/dev/null | wc -l)
    echo "✅ Encontradas $migration_count migraciones"
else
    echo "❌ Carpeta migrations no existe"
    exit 1
fi
cd ..
echo ""

# ════════════════════════════════════════════════════════════
# PASO 4: Verificar Frontend Next.js
# ════════════════════════════════════════════════════════════
echo "4️⃣  Verificando Frontend Next.js..."
cd frontend

if [ ! -f "package.json" ]; then
    echo "❌ package.json no existe"
    exit 1
fi
echo "✅ package.json encontrado"

# Verificar dependencies
if [ ! -d "node_modules" ]; then
    echo "   Instalando dependencias..."
    npm install --silent
fi
echo "✅ Dependencias instaladas"

# Verificar build
echo "   Compilando Next.js..."
if ! npm run build 2>/dev/null; then
    echo "❌ Error compilando Next.js"
    exit 1
fi
echo "✅ Frontend compilado correctamente"
cd ..
echo ""

# ════════════════════════════════════════════════════════════
# PASO 5: Resumen
# ════════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ VERIFICACIÓN COMPLETADA"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🎯 Próximos pasos para LIVE:"
echo ""
echo "1. Levanta los servicios:"
echo "   docker compose up -d"
echo ""
echo "2. Terminal 1 - Backend:"
echo "   cd backend && go run ./cmd/api"
echo ""
echo "3. Terminal 2 - Frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "4. Abre el navegador:"
echo "   http://localhost:3000"
echo ""
echo "5. Sigue la GUIA_DEPLOYMENT_VIVO.md para deploy en Railway"
echo ""
