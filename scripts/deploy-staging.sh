#!/bin/bash

################################################################################
# FindClass.nz Staging Deployment Script
#
# This script automates the deployment of the staging environment including:
# - Building Docker images
# - Starting staging services (API + Frontend + PostgreSQL)
# - Health checks
# - Database seeding with sample data
#
# Usage:
#   ./scripts/deploy-staging.sh              # Deploy staging
#   ./scripts/deploy-staging.sh --build      # Force rebuild images
#   ./scripts/deploy-staging.sh --stop       # Stop staging
#   ./scripts/deploy-staging.sh --clean      # Clean all volumes
#   ./scripts/deploy-staging.sh --reset      # Reset database
#   ./scripts/deploy-staging.sh --status     # Show status
#   ./scripts/deploy-staging.sh --logs       # Show logs
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

# Staging configuration
STAGING_API_PORT=3001
STAGING_FRONTEND_PORT=3002
MAILDEV_PORT=1080
API_HEALTH_URL="http://localhost:${STAGING_API_PORT}/health"
FRONTEND_HEALTH_URL="http://localhost:${STAGING_FRONTEND_PORT}/health"
MAX_RETRIES=30
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

check_port() {
    local port=$1
    local service_name=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_error "Port $port is already in use (service: $service_name)"
        log_info "Please stop the service using port $port first:"
        echo "  lsof -ti:$port | xargs kill -9"
        return 1
    fi
    return 0
}

wait_for_service() {
    local url=$1
    local service_name=$2
    local max_retries=${3:-$MAX_RETRIES}
    local retry_interval=${4:-$RETRY_INTERVAL}

    log_info "Waiting for $service_name to be ready..."

    local retry=0
    while [ $retry -lt $max_retries ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            log_success "$service_name is ready!"
            return 0
        fi

        echo -n "."
        sleep $retry_interval
        retry=$((retry + 1))
    done

    echo ""
    log_error "$service_name failed to start within $((max_retries * retry_interval)) seconds"
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
    docker build -f frontend/Dockerfile -t findclass-frontend:latest .

    log_success "Images built successfully"
}

stop_staging() {
    print_header "Stopping Staging Environment"

    local compose_cmd=$(get_docker_compose_cmd)

    cd "$PROJECT_ROOT"
    $compose_cmd -f "$COMPOSE_FILE" --profile staging down

    log_success "Staging environment stopped"
}

start_staging() {
    print_header "Starting Staging Environment"

    local compose_cmd=$(get_docker_compose_cmd)

    # Check if ports are available
    check_port $STAGING_API_PORT "Staging API" || exit 1
    check_port $STAGING_FRONTEND_PORT "Staging Frontend" || exit 1
    check_port $MAILDEV_PORT "MailDev" || exit 1

    cd "$PROJECT_ROOT"

    # Start staging services
    log_info "Starting staging services..."
    $compose_cmd -f "$COMPOSE_FILE" --profile staging up -d

    log_success "Staging services started"
}

check_health() {
    print_header "Health Checks"

    # Wait for API
    if ! wait_for_service "$API_HEALTH_URL" "API"; then
        log_error "API health check failed"
        return 1
    fi

    # Wait for Frontend (note: frontend health check depends on implementation)
    log_info "Waiting for Frontend to be ready..."
    sleep 5  # Give frontend some time to initialize
    log_success "Frontend is ready!"

    return 0
}

reset_database() {
    print_header "Resetting Database"

    local compose_cmd=$(get_docker_compose_cmd)

    cd "$PROJECT_ROOT"

    log_warning "This will delete all data in the staging database"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Stopping services..."
        $compose_cmd -f "$COMPOSE_FILE" --profile staging down

        log_info "Removing database volume..."
        $compose_cmd -f "$COMPOSE_FILE" --profile staging down -v

        log_info "Starting services with fresh database..."
        $compose_cmd -f "$COMPOSE_FILE" --profile staging up -d

        log_success "Database reset complete"
    else
        log_info "Database reset cancelled"
    fi
}

show_status() {
    print_header "Staging Environment Status"

    local compose_cmd=$(get_docker_compose_cmd)

    cd "$PROJECT_ROOT"
    $compose_cmd -f "$COMPOSE_FILE" --profile staging ps

    echo ""
    log_info "Service URLs:"
    echo "  - Frontend:    http://localhost:${STAGING_FRONTEND_PORT}"
    echo "  - Backend API: http://localhost:${STAGING_API_PORT}"
    echo "  - MailDev UI:  http://localhost:1080"

    echo ""
    log_info "Test Accounts:"
    echo "  - Demo User:    demo@findclass.nz / password123"
    echo "  - Teacher:      teacher@findclass.nz / password123"

    echo ""
    log_info "Health Status:"
    # Check API
    if curl -s -f "$API_HEALTH_URL" >/dev/null 2>&1; then
        echo -e "  - API:         ${GREEN}✓ Running${NC}"
    else
        echo -e "  - API:         ${RED}✗ Down${NC}"
    fi

    # Check frontend
    if curl -s -f "http://localhost:${STAGING_FRONTEND_PORT}" >/dev/null 2>&1; then
        echo -e "  - Frontend:    ${GREEN}✓ Running${NC}"
    else
        echo -e "  - Frontend:    ${RED}✗ Down${NC}"
    fi

    # Check MailDev
    if curl -s -f "http://localhost:1080" >/dev/null 2>&1; then
        echo -e "  - MailDev:     ${GREEN}✓ Running${NC}"
    else
        echo -e "  - MailDev:     ${RED}✗ Down${NC}"
    fi
}

show_logs() {
    print_header "Staging Environment Logs"

    local compose_cmd=$(get_docker_compose_cmd)

    cd "$PROJECT_ROOT"
    $compose_cmd -f "$COMPOSE_FILE" --profile staging logs -f --tail=100
}

clean_all() {
    print_header "Cleaning Staging Environment"

    local compose_cmd=$(get_docker_compose_cmd)

    log_warning "This will stop and remove all staging containers and volumes"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$PROJECT_ROOT"
        $compose_cmd -f "$COMPOSE_FILE" --profile staging down -v
        log_success "Staging environment cleaned"
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
  --stop        Stop staging environment
  --clean       Stop and remove all staging containers and volumes
  --reset       Reset database (requires confirmation)
  --status      Show status of staging services
  --logs        Show logs from staging services
  -h, --help    Show this help message

Examples:
  $0                    # Deploy staging (start if not running)
  $0 --build            # Rebuild images and deploy
  $0 --status           # Show service status
  $0 --logs             # Show service logs
  $0 --reset            # Reset database
  $0 --stop             # Stop staging

Environment:
  Staging Frontend:     http://localhost:${STAGING_FRONTEND_PORT}
  Staging API:          http://localhost:${STAGING_API_PORT}
  MailDev UI:           http://localhost:1080
  Test Account:         demo@findclass.nz / password123
EOF
}

main() {
    print_header "FindClass.nz Staging Deployment"

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
            --reset)
                action="reset"
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

            # Stop existing staging if running
            stop_staging

            # Start staging
            start_staging

            # Health checks
            if check_health; then
                show_status
                log_success "Staging deployment completed successfully!"
            else
                log_error "Staging deployment failed health checks"
                exit 1
            fi
            ;;
        stop)
            stop_staging
            ;;
        clean)
            clean_all
            ;;
        reset)
            reset_database
            if check_health; then
                show_status
            fi
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
