# ============================================
# Build Stage - Compile TypeScript
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency definitions first for better caching
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy source code and config files
COPY backend/ ./
COPY tsconfig.base.json ./

# Build TypeScript
RUN npm run build

# ============================================
# Production Stage - Minimal runtime image
# ============================================
FROM node:18-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copy built files from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Copy environment config files (exclude .env.local)
COPY --from=builder --chown=nodejs:nodejs /app/src/db ./dist/db
COPY --from=builder --chown=nodejs:nodejs /app/src/config/env ./dist/config/env
RUN rm -f /app/dist/config/env/.env.local

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/server.js"]
