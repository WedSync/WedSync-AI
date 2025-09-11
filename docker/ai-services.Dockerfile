# AI Version Intelligence Services Docker Configuration
# WS-200 API Versioning Strategy - Team D Implementation
# 
# Multi-stage Docker build for AI/ML services with wedding industry optimizations

# ====================================
# Stage 1: Base Image with AI Dependencies
# ====================================
FROM node:20-alpine AS ai-base

# Install Python for ML libraries and system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    python3-dev \
    build-base \
    linux-headers \
    libffi-dev \
    openssl-dev \
    postgresql-client \
    curl \
    git

# Create non-root user for security
RUN addgroup -g 1001 -S aiuser && \
    adduser -S aiuser -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY requirements.txt* ./

# Install Node.js dependencies with AI/ML optimizations
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Install Python ML dependencies if requirements.txt exists
RUN if [ -f requirements.txt ]; then pip3 install --no-cache-dir -r requirements.txt; fi

# ====================================
# Stage 2: Build Stage
# ====================================
FROM ai-base AS build

# Copy source code
COPY . .

# Build TypeScript with AI optimizations
ENV NODE_ENV=production
ENV AI_OPTIMIZATION_LEVEL=high
ENV WEDDING_SEASON_MODE=true

# Build the application
RUN npm run build

# ====================================
# Stage 3: Production Runtime
# ====================================
FROM ai-base AS production

# Copy built application
COPY --from=build --chown=aiuser:aiuser /app/dist ./dist
COPY --from=build --chown=aiuser:aiuser /app/public ./public
COPY --from=build --chown=aiuser:aiuser /app/src/lib/ai ./src/lib/ai
COPY --from=build --chown=aiuser:aiuser /app/next.config.ts ./
COPY --from=build --chown=aiuser:aiuser /app/package*.json ./

# Create necessary directories for AI services
RUN mkdir -p /app/ai-models \
             /app/ai-cache \
             /app/ai-logs \
             /app/wedding-data \
             /app/cultural-data && \
    chown -R aiuser:aiuser /app

# Set up AI model storage volume
VOLUME ["/app/ai-models", "/app/ai-cache", "/app/wedding-data"]

# Environment variables for AI services
ENV NODE_ENV=production
ENV AI_SERVICE_MODE=true
ENV WEDDING_INDUSTRY_MODE=true
ENV CULTURAL_INTELLIGENCE_ENABLED=true

# AI Performance optimizations
ENV UV_THREADPOOL_SIZE=16
ENV OPENAI_MAX_CONCURRENT=10
ENV REDIS_CONNECTION_POOL_SIZE=20
ENV SUPABASE_CONNECTION_POOL_SIZE=15

# Wedding-specific configurations
ENV WEDDING_DAY_PERFORMANCE_MODE=true
ENV PEAK_SEASON_SCALING=enabled
ENV CULTURAL_ANALYSIS_CACHE_TTL=3600
ENV MIGRATION_SAFETY_MODE=strict

# Health check for AI services
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health/ai || exit 1

# Switch to non-root user
USER aiuser

# Expose port
EXPOSE 3000

# Start AI services with enhanced monitoring
CMD ["npm", "run", "start:ai-enhanced"]

# ====================================
# Stage 4: AI Development Environment
# ====================================
FROM ai-base AS development

# Install development dependencies
RUN npm install

# Install additional AI development tools
RUN pip3 install --no-cache-dir \
    jupyter \
    tensorboard \
    matplotlib \
    seaborn \
    pandas \
    numpy \
    scikit-learn

# Copy source code
COPY . .

# Set development environment
ENV NODE_ENV=development
ENV AI_DEBUG_MODE=true
ENV WEDDING_SEASON_SIMULATION=enabled

# Create Jupyter notebook directory
RUN mkdir -p /app/notebooks && \
    chown -R aiuser:aiuser /app/notebooks

# Expose additional ports for development
EXPOSE 3000 8888 6006

# Development command with hot reload
CMD ["npm", "run", "dev:ai"]

# ====================================
# Stage 5: AI Model Training Environment
# ====================================
FROM python:3.11-slim AS ai-training

# Install system dependencies for ML
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install ML libraries
RUN pip install --no-cache-dir \
    tensorflow==2.15.0 \
    torch==2.1.0 \
    scikit-learn==1.3.0 \
    numpy==1.24.3 \
    pandas==2.0.3 \
    matplotlib==3.7.2 \
    seaborn==0.12.2 \
    jupyter==1.0.0 \
    tensorboard==2.15.1 \
    wandb==0.16.0

# Set working directory
WORKDIR /training

# Create training directories
RUN mkdir -p /training/data \
             /training/models \
             /training/notebooks \
             /training/outputs

# Copy training scripts
COPY ai-training/ .
COPY package*.json ./

# Install Node.js for training pipeline
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install

# Training environment variables
ENV PYTHONPATH=/training
ENV TRAINING_MODE=true
ENV WEDDING_DATASET_SIZE=large
ENV CULTURAL_DATASET_ENABLED=true

# Expose Jupyter and TensorBoard ports
EXPOSE 8888 6006

# Training command
CMD ["python", "train_ai_models.py"]

# ====================================
# Final Stage Selection
# ====================================
FROM production AS final