# Multi-stage build for the entire gamification platform
FROM node:18-alpine AS base

# Install curl for health checks
RUN apk add --no-cache curl

# ===== BACKEND STAGE =====
FROM base AS backend-builder
WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/ .

# ===== FRONTEND STAGE =====
FROM base AS frontend-builder
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ .

# Build frontend (optional - for production)
# RUN npm run build

# ===== FINAL STAGE =====
FROM base AS final

# Create app directory structure
WORKDIR /app

# Copy built applications
COPY --from=backend-builder /app/backend ./backend
COPY --from=frontend-builder /app/frontend ./frontend

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose ports
EXPOSE 3000 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Default command (this is mainly for reference - use docker-compose for actual deployment)
CMD ["echo", "Use docker-compose to run the full application"] 