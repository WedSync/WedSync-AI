# PDF Analysis System - Production Dockerfile
# WS-242: AI PDF Analysis System - Containerized Deployment

FROM node:18-alpine AS base

# Install system dependencies for PDF processing
RUN apk add --no-cache \
    ghostscript \
    imagemagick \
    poppler-utils \
    python3 \
    py3-pip \
    cairo-dev \
    pango-dev \
    giflib-dev \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
FROM base AS deps
RUN yarn install --frozen-lockfile --production=false

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM base AS runner

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy PDF analysis specific files
COPY --from=builder --chown=nextjs:nodejs /app/scripts/initialize-wedding-patterns.ts ./scripts/
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/services/weddingFieldPatternsService.ts ./src/lib/services/

# Create directories for file processing
RUN mkdir -p /app/uploads /app/temp /app/logs
RUN chown -R nextjs:nodejs /app/uploads /app/temp /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/pdf-analysis/upload || exit 1

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Start the application
CMD ["node", "server.js"]