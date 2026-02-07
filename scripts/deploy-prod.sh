#!/bin/bash

################################################################################
# FindClass.nz Production Deployment Script
#
# This script automates the deployment of the production environment including:
# - Building Docker images
# - Starting production services (API + Frontend + PostgreSQL)
# - Running database migrations
# - Health checks
#
# Usage:
#   ./scripts/deploy-prod.sh              # Deploy production
#   ./scripts/deploy-prod.sh --build      # Force rebuild images
#   ./scripts/deploy-prod.sh --stop       # Stop production
#   ./scripts/deploy-prod.sh --clean      # Clean all volumes
#   ./scripts/deploy-prod.sh --status     # Show status
#   ./scripts/deploy-prod.sh --logs       # Show logs
################################################################################

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"

# Production configuration
PROD_API_CONTAINER="fc-prod-api"
PROD_FRONTEND_CONTAINER="fc-prod-frontend"
PROD_POSTGRES_CONTAINER="fc-prod-postgres"
MAX_RETRIES=60
RETRY_INTERVAL=2

################################################################################
# Helper Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
}

get_docker_compose_cmd() {
    if docker compose version &> /dev/null; then
        echo "docker compose"
    else
        echo "docker-compose"
    fi
}

wait_for_container() {
    local container_name=$1
    local service_display_name=$2
    local max_retries=${3:-$MAX_RETRIES}
    local retry_interval=${4:-$RETRY_INTERVAL}

    log_info "Waiting for $service_display_name to be ready..."

    local retry=0
    while [ $retry -lt $max_retries ]; do
        if docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null | grep -q "healthy"; then
            log_success "$service_display_name is healthy!"
            return 0
        fi

        # Also check if container is running (fallback for services without healthcheck)
        if docker inspect --format='{{.State.Running}}' "$container_name" 2>/dev/null | grep -q "true"; then
            # Give it a bit more time to become healthy
            if [ $retry -gt 10 ]; then
                log_success "$service_display_name is running!"
                return 0
            fi
        fi

        echo -n "."
        sleep $retry_interval
        retry=$((retry + 1))
    done

    echo ""
    log_error "$service_display_name failed to start within $((max_retries * retry_interval)) seconds"
    return 1
}

################################################################################
# Deployment Functions
################################################################################

build_images() {
    print_header "Building Docker Images"

    cd "$PROJECT_ROOT"

    log_info "Building backend image..."
    docker build -f backend/Dockerfile -t findclass-backend:latest .

    log_info "Building frontend image..."
    docker build -f frontend/Dockerfile \
      --build-arg BUILD_MODE=prod \
      -t findclass-frontend:latest .

    log_success "Images built successfully"
}

stop_prod() {
    print_header "Stopping Production Environment"

    local compose_cmd=$(get_docker_compose_cmd)

    cd "$PROJECT_ROOT"
    $compose_cmd -f "$COMPOSE_FILE" --profile prod down

    log_success "Production environment stopped"
}

run_migrations() {
    print_header "Running Database Migrations"

    log_info "Waiting for API container to be ready..."
    wait_for_container "$PROD_API_CONTAINER" "Production API"

    log_info "Running pending migrations on prod database..."

    # Run migrations
    docker exec "$PROD_API_CONTAINER" npm run migrate

    log_success "Migrations completed"

    # Show migration status
    echo ""
    log_info "Migration status:"
    docker exec "$PROD_API_CONTAINER" npm run migrate:status
}

start_prod() {
    print_header "Starting Production Environment"

    local compose_cmd=$(get_docker_compose_cmd)

    cd "$PROJECT_ROOT"

    # Start production services first
    log_info "Starting production services..."
    $compose_cmd -f "$COMPOSE_FILE" --profile prod up -d

    # Then start nginx-gateway
    log_info "Starting nginx-gateway..."
    $compose_cmd -f "$COMPOSE_FILE" up -d nginx-gateway

    log_success "Production services started"

    # Run migrations BEFORE health checks
    run_migrations
}

check_health() {
    print_header "Health Checks"

    # Wait for API
    if ! wait_for_container "$PROD_API_CONTAINER" "Production API"; then
        log_error "Production API health check failed"
        return 1
    fi

    # Wait for Frontend
    if ! wait_for_container "$PROD_FRONTEND_CONTAINER" "Production Frontend"; then
        log_error "Production Frontend health check failed"
        return 1
    fi

    return 0
}

show_status() {
    print_header "Production Environment Status"

    local compose_cmd=$(get_docker_compose_cmd)

    cd "$PROJECT_ROOT"
    $compose_cmd -f "$COMPOSE_FILE" --profile prod ps

    echo ""
    log_info "Service URLs:"
    echo "  - Frontend:   http://findclass.nz"
    echo "  - API:        http://api.findclass.nz"

    echo ""
    log_info "Container Health Status:"

    # Check API
    if docker inspect --format='{{.State.Health.Status}}' "$PROD_API_CONTAINER" 2>/dev/null | grep -q "healthy"; then
        echo -e "  - API:         ${GREEN}✓ Healthy${NC}"
    else
        echo -e "  - API:         ${RED}✗ Unhealthy${NC}"
    fi

    # Check Frontend
    if docker inspect --format='{{.State.Health.Status}}' "$PROD_FRONTEND_CONTAINER" 2>/dev/null | grep -q "healthy"; then
        echo -e "  - Frontend:    ${GREEN}✓ Healthy${NC}"
    else
        echo -e "  - Frontend:    ${RED}✗ Unhealthy${NC}"
    fi

    # Check PostgreSQL
    if docker inspect --format='{{.State.Health.Status}}' "$PROD_POSTGRES_CONTAINER" 2>/dev/null | grep -q "healthy"; then
        echo -e "  - PostgreSQL:  ${GREEN}✓ Healthy${NC}"
    else
        echo -e "  - PostgreSQL:  ${RED}✗ Unhealthy${NC}"
    fi

    echo ""
    log_info "Data Directory:"
    echo "  - Uploads:    /Users/dianwenwang/findclassdata/prod/uploads"
    echo "  - Database:   /Users/dianwenwang/findclassdata/prod/postgres"
}

show_logs() {
    print_header "Production Environment Logs"

    local compose_cmd=$(get_docker_compose_cmd)

    cd "$PROJECT_ROOT"
    $compose_cmd -f "$COMPOSE_FILE" --profile prod logs -f --tail=100
}

clean_all() {
    print_header "Cleaning Production Environment"

    local compose_cmd=$(get_docker_compose_cmd)

    log_warning "This will stop and remove all production containers and volumes"
    log_warning "Production data will be preserved in /Users/dianwenwang/findclassdata/prod/"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$PROJECT_ROOT"
        $compose_cmd -f "$COMPOSE_FILE" --profile prod down
        log_success "Production environment cleaned"
    else
        log_info "Clean cancelled"
    fi
}

################################################################################
# Main Script
################################################################################

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
  --build       Force rebuild Docker images before starting
  --stop        Stop production environment
  --clean       Stop and remove all production containers
  --status      Show status of production services
  --logs        Show logs from production services
  -h, --help    Show this help message

Examples:
  $0                    # Deploy production (start if not running)
  $0 --build            # Rebuild images and deploy
  $0 --status           # Show service status
  $0 --logs             # Show service logs
  $0 --stop             # Stop production

Environment:
  Production Frontend:   http://findclass.nz
  Production API:        http://api.findclass.nz
  Data Directory:        /Users/dianwenwang/findclassdata/prod/

Notes:
  - Migrations run automatically on deployment
  - Production database is NOT seeded with sample data
  - Only port 80 is exposed (via nginx-gateway)
EOF
}

main() {
    print_header "FindClass.nz Production Deployment"

    # Check prerequisites
    check_docker

    # Parse arguments
    local force_build=false
    local action="deploy"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --build)
                force_build=true
                shift
                ;;
            --stop)
                action="stop"
                shift
                ;;
            --clean)
                action="clean"
                shift
                ;;
            --status)
                action="status"
                shift
                ;;
            --logs)
                action="logs"
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Execute action
    case $action in
        deploy)
            if [ "$force_build" = true ]; then
                build_images
            fi

            # Stop existing prod if running
            stop_prod

            # Start prod
            start_prod

            # Health checks
            if check_health; then
                show_status
                log_success "Production deployment completed successfully!"
            else
                log_error "Production deployment failed health checks"
                exit 1
            fi
            ;;
        stop)
            stop_prod
            ;;
        clean)
            clean_all
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
    esac
}

# Run main function
main "$@"
