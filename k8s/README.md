# MedLab — Production Deployment Guide

## Architecture

```
                        ┌─────────────────────────┐
                        │     Let's Encrypt        │
                        │   (cert-manager)         │
                        └────────────┬────────────┘
                                     │ TLS
                        ┌────────────▼────────────┐
                        │   NGINX Ingress          │
                        │   (Rate Limiting)        │
                        └────┬──────────────┬─────┘
                             │              │
                    app.medlab.cm     api.medlab.cm
                             │              │
                   ┌─────────▼──┐  ┌────────▼────┐
                   │  Frontend  │  │   Backend    │
                   │  (Nginx)   │  │   (NestJS)   │
                   │  x2 pods   │  │  x2-6 pods   │
                   └────────────┘  └──┬────┬──┬───┘
                                      │    │  │
                            ┌─────────┘    │  └─────────┐
                   ┌────────▼──┐  ┌────────▼──┐  ┌──────▼──┐
                   │ PostgreSQL │  │   Redis    │  │  MinIO  │
                   │  (15-alp)  │  │  (7-alp)   │  │  (S3)   │
                   │  20Gi PVC  │  │  256MB LRU │  │ 50Gi PVC│
                   └────────────┘  └───────────┘  └─────────┘
                         │
                    ┌────▼─────┐
                    │ CronJob  │
                    │ pg_dump  │ ← Daily 02:00 UTC
                    │ → MinIO  │   (30-day retention)
                    └──────────┘
```

## Prerequisites

1. **Kubernetes Cluster** (DigitalOcean, GKE, EKS, or self-managed)
2. **kubectl** configured with cluster access
3. **cert-manager** for SSL certificates
4. **nginx-ingress** controller
5. **DNS** configured:
   - `app.medlab.cm` → Ingress External IP
   - `api.medlab.cm` → Ingress External IP

## Quick Start

### 1. Install Prerequisites

```bash
# cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# nginx-ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# Wait for readiness
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s
```

### 2. Configure Secrets

```bash
# Create secrets from .env.production
kubectl create namespace medlab

kubectl -n medlab create secret generic medlab-secrets \
  --from-literal=DB_PASSWORD='YOUR_STRONG_PASSWORD' \
  --from-literal=JWT_SECRET='YOUR_64_CHAR_JWT_SECRET' \
  --from-literal=MINIO_ACCESS_KEY='YOUR_MINIO_KEY' \
  --from-literal=MINIO_SECRET_KEY='YOUR_MINIO_SECRET' \
  --from-literal=SENTRY_DSN='YOUR_SENTRY_DSN'

# GHCR pull secret (for private images)
kubectl -n medlab create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USER \
  --docker-password=YOUR_GITHUB_PAT
```

### 3. Deploy

```bash
# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/minio-deployment.yaml

# Wait for DB to be ready
kubectl -n medlab wait --for=condition=ready pod -l component=postgres --timeout=120s

# Deploy application
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/backup-cronjob.yaml

# Run migrations
kubectl -n medlab exec deploy/medlab-backend -- npx prisma migrate deploy

# Seed database (first deployment only)
kubectl -n medlab exec deploy/medlab-backend -- npx prisma db seed
```

### 4. Verify

```bash
kubectl -n medlab get pods
kubectl -n medlab get ingress
kubectl -n medlab get certificates

# Test health
curl https://api.medlab.cm/api/health
```

## Backup & Restore

### Manual Backup

```bash
kubectl -n medlab create job manual-backup --from=cronjob/medlab-pg-backup
kubectl -n medlab logs job/manual-backup -f
```

### Restore

```bash
# List available backups
kubectl -n medlab exec deploy/medlab-backend -- mc alias set medlab http://medlab-minio:9000 $KEY $SECRET
kubectl -n medlab exec deploy/medlab-backend -- mc ls medlab/medlab-backups/daily/

# Restore specific backup
kubectl -n medlab exec -it deploy/medlab-backend -- /scripts/restore.sh medlab_backup_20260211_020000.sql.gz
```

## Monitoring

- **Swagger UI**: https://api.medlab.cm/api/docs
- **Health Check**: https://api.medlab.cm/api/health
- **Sentry**: Configured via SENTRY_DSN

## CI/CD Pipeline

The pipeline is defined in `.github/workflows/ci-cd.yml`:

| Stage | Trigger | Actions |
|-------|---------|---------|
| **Lint** | All pushes/PRs | TypeScript type check, ESLint |
| **Unit Tests** | All pushes/PRs | Backend (Jest + real PG/Redis), Frontend (Vitest) |
| **Build** | After tests pass | Docker build, push to GHCR |
| **E2E** | PRs + main | Playwright (Chromium) against real services |
| **Deploy** | main only | K8s rollout, migration, health check |

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `KUBE_CONFIG` | Base64-encoded kubeconfig |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions |

### Required Environment

- Create a **production** environment in GitHub repo settings
- Add protection rules (require reviewers, etc.)

## Scaling

```bash
# Manual scaling
kubectl -n medlab scale deploy/medlab-backend --replicas=4

# HPA is auto-configured (2-6 replicas based on CPU/memory)
kubectl -n medlab get hpa
```
