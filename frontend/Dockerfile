# Build mode argument (staging or prod)
ARG BUILD_MODE=staging

# ============================================
# Production Build Stage
# ============================================
FROM node:18-alpine AS builder

# Declare build mode again for this stage
ARG BUILD_MODE=staging

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code and environment files
WORKDIR /app
COPY frontend/ ./
COPY tsconfig.base.json ../
COPY frontend/index.html ./index.html

# Copy environment file based on build mode
COPY frontend/.env.${BUILD_MODE} ./.env.${BUILD_MODE}

# Build production assets with specified mode
# Temporarily remove stories and test files to avoid TS errors
RUN rm -rf stories src/test
RUN npm run build -- --mode ${BUILD_MODE}

# ============================================
# Production Nginx Stage
# ============================================
FROM nginx:alpine AS production

# Declare build mode again for this stage
ARG BUILD_MODE=staging

# Install curl/wget for health checks
RUN apk add --no-cache curl

# Copy nginx config based on build mode
COPY frontend/nginx.${BUILD_MODE}.conf /etc/nginx/nginx.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
