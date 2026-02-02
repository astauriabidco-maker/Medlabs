---
description: Comment démarrer le projet MedLabs en développement
---

# Démarrage du projet MedLabs

## Méthode 1 : Script automatisé (recommandé)

// turbo-all
```bash
# Depuis la racine du projet
./start-dev.sh
```

Ce script :
1. Vérifie que Docker Desktop est démarré
2. Lance PostgreSQL + MinIO via docker-compose
3. Attend que PostgreSQL soit prêt
4. Applique les migrations Prisma
5. Seed les données (admin@medlab.cm, lab@medlab.cm)
6. Démarre le backend

## Méthode 2 : Démarrage manuel

### Étape 1 : Démarrer Docker Desktop
Ouvrez Docker Desktop et attendez qu'il soit prêt.

### Étape 2 : Lancer les conteneurs
```bash
docker-compose up -d
```

### Étape 3 : Setup base de données
```bash
cd backend
npm run db:setup
```

### Étape 4 : Démarrer le backend
```bash
npm run start:dev
```

### Étape 5 : Démarrer le frontend (autre terminal)
```bash
cd frontend
npm run dev
```

## Comptes de test

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| admin@medlab.cm | pass123 | Super Admin |
| lab@medlab.cm | pass123 | Lab Admin |
| tech@medlab.cm | pass123 | Technicien |

## Scripts npm disponibles

| Commande | Description |
|----------|-------------|
| `npm run db:migrate` | Applique les migrations en production |
| `npm run db:seed` | Seed les données initiales |
| `npm run db:setup` | migrate + seed (pour dev) |
| `npm run db:reset` | Reset complet de la BD (⚠️ perd les données) |

## Ports utilisés

| Service | Port |
|---------|------|
| Backend API | 3005 |
| Frontend | 5173 |
| PostgreSQL | 5434 |
| MinIO S3 | 9000 |
| MinIO Console | 9001 |

## Résolution de problèmes

### "Connection refused"
→ Docker Desktop n'est pas démarré. Lancez-le et réessayez.

### "Relation does not exist"
→ Les migrations n'ont pas été appliquées. Exécutez `npm run db:setup`.

### Données perdues au redémarrage
→ Ne jamais utiliser `docker-compose down -v` (le `-v` supprime les volumes).
→ Utilisez `docker-compose down` sans le `-v` pour garder les données.
