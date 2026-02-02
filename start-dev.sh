#!/bin/bash

# MedLabs - Script de démarrage automatisé
# Ce script démarre tous les services nécessaires

set -e  # Exit on any error

echo "🚀 MedLabs - Démarrage automatisé"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Check if Docker is running
echo -e "\n${YELLOW}📦 Vérification de Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker n'est pas démarré. Veuillez lancer Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker est en cours d'exécution${NC}"

# 2. Start Docker containers
echo -e "\n${YELLOW}🐳 Démarrage des conteneurs Docker...${NC}"
docker-compose up -d

# 3. Wait for PostgreSQL to be ready
echo -e "\n${YELLOW}⏳ Attente de PostgreSQL...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0
until docker exec medlab_postgres pg_isready -U admin -d medlab_db > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo -e "${RED}❌ PostgreSQL n'a pas démarré après ${MAX_RETRIES} tentatives${NC}"
        exit 1
    fi
    echo "  Attente... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done
echo -e "${GREEN}✅ PostgreSQL est prêt${NC}"

# 4. Run Prisma migrations
echo -e "\n${YELLOW}📊 Application des migrations Prisma...${NC}"
cd backend
npx prisma migrate deploy
echo -e "${GREEN}✅ Migrations appliquées${NC}"

# 5. Seed database (idempotent with upsert)
echo -e "\n${YELLOW}🌱 Initialisation des données...${NC}"
npx prisma db seed
echo -e "${GREEN}✅ Données initiales créées${NC}"

# 6. Start backend
echo -e "\n${YELLOW}🔧 Démarrage du backend...${NC}"
echo -e "${GREEN}=================================="
echo -e "✅ MedLabs est prêt !"
echo -e "  Backend: http://localhost:3005"
echo -e "  Frontend: http://localhost:5173 (lancez 'npm run dev' dans /frontend)"
echo -e "  PostgreSQL: localhost:5434"
echo -e "  MinIO Console: http://localhost:9001"
echo -e "==================================${NC}"

npm run start:dev
