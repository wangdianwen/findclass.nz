# Production Deployment Implementation

## Summary

This implementation adds production deployment capability to the FindClass.nz project with the following features:

- **Separate PostgreSQL instances** for staging and production
- **Persistent data storage** at `/Users/dianwenwang/findclassdata/{staging,prod}`
- **Optimized Docker architecture** with only port 80 exposed (via nginx-gateway)
- **Database migrations** integrated into production deployment
- **Domain-based routing** via nginx reverse proxy

## Architecture

```
External (127.0.0.1:80) - findclass.nz, api.findclass.nz, staging.findclass.nz, etc.
    ↓
Gateway Nginx (in Docker network "findclass-network")
    ↓
    ├─ findclass.nz → http://prod-frontend:80
    ├─ api.findclass.nz → http://prod-api:3000
    ├─ staging.findclass.nz → http://staging-frontend:80
    └─ api.staging.findclass.nz → http://staging-api:3000
```

**Key Points:**
- **Only port 80 exposed** (via nginx-gateway container)
- **All services in internal Docker network** - no direct host access
- **Separate databases** - staging-postgres and prod-postgres with independent data

## Changes Made

### 1. Docker Compose Configuration (`docker-compose.yml`)

**Removed:**
- LocalStack service (no longer needed)
- All port mappings (except nginx-gateway:80)
- Named volumes (postgres-data, localstack-data, uploads-data)

**Added:**
- `nginx-gateway` service (only service exposing port 80)
- `staging-postgres` with bind mount to `/Users/dianwenwang/findclassdata/staging/postgres`
- `prod-postgres` with bind mount to `/Users/dianwenwang/findclassdata/prod/postgres`
- Separate staging and prod services with proper container names

### 2. Gateway Nginx Configuration (`nginx/nginx.conf`, `nginx/sites-available/findclass.conf`)

Created gateway nginx that routes domains to internal containers:
- `findclass.nz` → `prod-frontend:80`
- `api.findclass.nz` → `prod-api:3000`
- `staging.findclass.nz` → `staging-frontend:80`
- `api.staging.findclass.nz` → `staging-api:3000`

### 3. Frontend Nginx Configurations

**Created `frontend/nginx.prod.conf`:**
- Production frontend configuration
- API proxy to `prod-api:3000`

**Updated `frontend/nginx.staging.conf`:**
- Already correctly configured for `staging-api:3000`
- No changes needed

### 4. Frontend Dockerfile (`frontend/Dockerfile`)

**Added:**
- `ARG BUILD_MODE` support
- Dynamic environment file copying based on BUILD_MODE
- Dynamic nginx config copying based on BUILD_MODE

### 5. Production Deployment Script (`scripts/deploy-prod.sh`)

**Created:**
- Full production deployment automation
- **Database migrations integrated** - runs automatically after API starts
- Container-based health checks (no port checking)
- Status display showing container health and data directories

### 6. Staging Deployment Script (`scripts/deploy-staging.sh`)

**Updated:**
- Removed `check_port()` function (no longer needed)
- Removed `wait_for_service()` - replaced with `wait_for_container()`
- Updated status display for domain-based URLs
- Updated to show container health status

## Deployment Instructions

### 1. Update /etc/hosts

Add these entries (if not already present):

```bash
sudo nano /etc/hosts
```

Add:
```
127.0.0.1 findclass.nz
127.0.0.1 api.findclass.nz
127.0.0.1 staging.findclass.nz
127.0.0.1 api.staging.findclass.nz
```

### 2. Deploy Staging

```bash
cd /Users/dianwenwang/project/findclass.nz-prod
./scripts/deploy-staging.sh

# Check status
./scripts/deploy-staging.sh --status

# Access at:
# - Frontend: http://staging.findclass.nz
# - API: http://api.staging.findclass.nz
```

### 3. Deploy Production

```bash
./scripts/deploy-prod.sh

# The script will automatically:
# 1. Build Docker images
# 2. Start prod services
# 3. Run database migrations
# 4. Verify health checks

# Check status
./scripts/deploy-prod.sh --status

# Access at:
# - Frontend: http://findclass.nz
# - API: http://api.findclass.nz
```

## Data Persistence

**Staging:**
- PostgreSQL: `/Users/dianwenwang/findclassdata/staging/postgres`
- Uploads: `/Users/dianwenwang/findclassdata/staging/uploads`
- Seeded with sample data (`SEED_SAMPLE_DATA=true`)

**Production:**
- PostgreSQL: `/Users/dianwenwang/findclassdata/prod/postgres`
- Uploads: `/Users/dianwenwang/findclassdata/prod/uploads`
- No seed data (`SEED_SAMPLE_DATA=false`)

## Database Migrations

**Existing migrations** (will run automatically on prod deployment):
- `001_initial_schema.sql` - Base schema with 13 tables
- `002_social_login_support.sql` - Social login fields
- `003_add_missing_course_fields.sql` - Course detail fields

**Migration status check:**
```bash
docker exec findclass-prod-api npm run migrate:status
```

## Verification Steps

### 1. Check Network Isolation

```bash
# Only port 80 should be listening
netstat -an | grep LISTEN | grep ':80 '
# Should show nginx-gateway

# No other ports exposed
netstat -an | grep LISTEN | grep -E '3000|3001|3002|5432'
# Should return nothing
```

### 2. Verify Domain Routing

```bash
# All should work via port 80
curl -I http://findclass.nz
curl -I http://api.findclass.nz/api/v1/health
curl -I http://staging.findclass.nz
curl -I http://api.staging.findclass.nz/api/v1/health
```

### 3. Check Container Health

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Expected output:
```
NAMES                      STATUS
findclass-nginx-gateway    Up X minutes (healthy)
findclass-prod-postgres    Up X minutes (healthy)
findclass-prod-api         Up X minutes (healthy)
findclass-prod-frontend    Up X minutes (healthy)
findclass-staging-postgres  Up X minutes (healthy)
findclass-staging-api       Up X minutes (healthy)
findclass-staging-frontend  Up X minutes (healthy)
```

### 4. Verify Database Separation

```bash
# Staging (should have data)
docker exec findclass-staging-postgres psql -U findclass -d findclass -c "SELECT COUNT(*) FROM users;"
# Should return > 0

# Prod (should be empty initially)
docker exec findclass-prod-postgres psql -U findclass -d findclass -c "SELECT COUNT(*) FROM users;"
# Should return 0
```

### 5. Check Migrations Ran

```bash
docker exec findclass-prod-api npm run migrate:status
# Should show all migrations as "executed"
```

## Rollback Plan

If issues occur:

```bash
# Stop all services
./scripts/deploy-staging.sh --stop
./scripts/deploy-prod.sh --stop
docker-compose --profile staging --profile prod down

# Restore old configuration (if needed)
git checkout docker-compose.yml
git checkout frontend/Dockerfile
git checkout scripts/deploy-staging.sh

# Restart with old config
./scripts/deploy-staging.sh
```

## Next Steps

1. **Test staging deployment:**
   ```bash
   ./scripts/deploy-staging.sh
   ```

2. **Update E2E test configurations** (if needed):
   - Update `frontend/playwright.config.ts` baseURL to use domains
   - Update `frontend/playwright.integration.config.ts` to use `staging.findclass.nz`

3. **Deploy to production:**
   ```bash
   ./scripts/deploy-prod.sh
   ```

4. **Run E2E tests:**
   ```bash
   cd frontend
   BASE_URL=http://staging.findclass.nz npm run test:e2e:integration
   ```

## Security Notes

- **No direct service access** - all traffic goes through gateway nginx on port 80
- **Internal Docker networking** - containers communicate via container names
- **Separate databases** - staging and prod data completely isolated
- **No test data in prod** - production database starts empty
- **Persistent storage** - data survives container restarts via bind mounts

## Troubleshooting

### Port 80 Already in Use

```bash
# Check what's using port 80
sudo lsof -i :80

# Stop the service (if needed)
sudo systemctl stop nginx  # If system nginx is running
```

### Container Health Failing

```bash
# Check container logs
docker logs findclass-prod-api
docker logs findclass-prod-frontend
docker logs findclass-nginx-gateway

# Check individual container health
docker inspect findclass-prod-api --format='{{.State.Health.Status}}'
```

### Migration Issues

```bash
# Check migration status
docker exec findclass-prod-api npm run migrate:status

# Re-run migrations manually
docker exec findclass-prod-api npm run migrate
```

### Gateway Nginx Issues

```bash
# Check gateway configuration
docker exec findclass-nginx-gateway nginx -t

# Check gateway logs
docker logs findclass-nginx-gateway
```

## Files Modified/Created

### Modified
- `docker-compose.yml` - Complete restructure for prod/staging separation
- `frontend/Dockerfile` - Added BUILD_MODE argument support
- `scripts/deploy-staging.sh` - Removed port checking, added container health checks

### Created
- `nginx/nginx.conf` - Main gateway nginx configuration
- `nginx/sites-available/findclass.conf` - Domain routing configuration
- `frontend/nginx.prod.conf` - Production frontend nginx config
- `scripts/deploy-prod.sh` - Production deployment script with migrations

### Data Directories Created
- `/Users/dianwenwang/findclassdata/staging/postgres`
- `/Users/dianwenwang/findclassdata/staging/uploads`
- `/Users/dianwenwang/findclassdata/prod/postgres`
- `/Users/dianwenwang/findclassdata/prod/uploads`
