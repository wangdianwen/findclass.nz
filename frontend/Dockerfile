# ============================================
# Production Build Stage
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code and environment files
WORKDIR /app
COPY frontend/ ./
COPY tsconfig.base.json ../
COPY frontend/index.html ./index.html

# Copy staging environment file for build
COPY frontend/.env.staging ./.env.staging

# Build production assets with staging mode
# Remove stories and test files FIRST to avoid TypeScript errors
RUN rm -rf stories src/test
RUN npm run build -- --mode staging

# ============================================
# Production Nginx Stage
# ============================================
FROM nginx:alpine AS production

# Install curl/wget for health checks
RUN apk add --no-cache curl

# Copy custom nginx config (default)
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
