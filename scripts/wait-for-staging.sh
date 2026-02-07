#!/bin/bash
# Wait for staging services to be healthy
# This script checks if the backend and frontend are ready

set -e

echo "Waiting for staging environment to be ready..."

timeout=60
elapsed=0
backend_healthy=false
frontend_healthy=false

while [ $elapsed -lt $timeout ]; do
  echo "Checking services... (${elapsed}s elapsed)"

  # Check backend health
  if [ "$backend_healthy" = false ]; then
    if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
      echo "✓ Backend is healthy"
      backend_healthy=true
    else
      echo "× Backend not ready yet"
    fi
  fi

  # Check frontend health
  if [ "$frontend_healthy" = false ]; then
    if curl -f -s http://localhost:3002 > /dev/null 2>&1; then
      echo "✓ Frontend is healthy"
      frontend_healthy=true
    else
      echo "× Frontend not ready yet"
    fi
  fi

  # Exit if both are healthy
  if [ "$backend_healthy" = true ] && [ "$frontend_healthy" = true ]; then
    echo ""
    echo "✅ Staging environment is ready!"
    echo "  Backend: http://localhost:3001"
    echo "  Frontend: http://localhost:3002"
    exit 0
  fi

  sleep 2
  elapsed=$((elapsed + 2))
done

echo ""
echo "❌ Staging environment failed to start within ${timeout}s"
echo ""
echo "Troubleshooting:"
echo "  1. Check docker logs: docker-compose logs"
echo "  2. Check port conflicts: lsof -i :3001 -i :3002"
echo "  3. Restart services: docker-compose down && docker-compose up -d"
exit 1
