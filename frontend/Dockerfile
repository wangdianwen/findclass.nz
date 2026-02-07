# ============================================
# Production Build Stage
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build with API base URL if provided
ARG API_BASE_URL=
ENV VITE_API_BASE_URL=${API_BASE_URL}

# Build production assets
RUN npm run build

# ============================================
# Production Nginx Stage
# ============================================
FROM nginx:alpine AS production

# Install curl/wget for health checks
RUN apk add --no-cache curl

# Copy custom nginx config (default)
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
