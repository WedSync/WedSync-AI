# Makefile for Journey Builder Docker operations

.PHONY: help build up down logs shell test clean

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(CYAN)Journey Builder Docker Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

build: ## Build Journey Builder containers
	@echo "$(YELLOW)Building Journey Builder containers...$(NC)"
	docker-compose -f docker-compose.journey-builder.yml build

up: ## Start Journey Builder development environment
	@echo "$(GREEN)Starting Journey Builder...$(NC)"
	docker-compose -f docker-compose.journey-builder.yml up -d
	@echo "$(GREEN)Journey Builder is running at http://localhost:3000/journeys$(NC)"
	@echo "$(CYAN)Analytics dashboard at http://localhost:3003 (admin/admin)$(NC)"

down: ## Stop Journey Builder containers
	@echo "$(YELLOW)Stopping Journey Builder...$(NC)"
	docker-compose -f docker-compose.journey-builder.yml down

logs: ## View Journey Builder logs
	docker-compose -f docker-compose.journey-builder.yml logs -f journey-builder

shell: ## Open shell in Journey Builder container
	docker exec -it journey-builder-dev sh

test: ## Run Journey Builder tests
	@echo "$(CYAN)Running Journey Builder tests...$(NC)"
	docker-compose -f docker-compose.journey-builder.yml --profile testing run journey-tester

test-watch: ## Run tests in watch mode
	docker-compose -f docker-compose.journey-builder.yml --profile testing run journey-tester npx playwright test --ui

clean: ## Clean up Journey Builder volumes and containers
	@echo "$(RED)Cleaning up Journey Builder...$(NC)"
	docker-compose -f docker-compose.journey-builder.yml down -v
	docker system prune -f

restart: down up ## Restart Journey Builder

rebuild: clean build up ## Rebuild and restart Journey Builder

analytics: ## Start Journey Builder with analytics
	@echo "$(CYAN)Starting Journey Builder with analytics...$(NC)"
	docker-compose -f docker-compose.journey-builder.yml --profile analytics up -d

storybook: ## Start Storybook for Journey Builder components
	@echo "$(CYAN)Starting Storybook...$(NC)"
	docker-compose -f docker-compose.journey-builder.yml --profile storybook up -d journey-storybook
	@echo "$(GREEN)Storybook is running at http://localhost:6006$(NC)"

db-shell: ## Open PostgreSQL shell
	docker exec -it journey-postgres psql -U journey -d journey_builder

redis-cli: ## Open Redis CLI
	docker exec -it journey-redis redis-cli

inspect: ## Inspect Journey Builder container
	docker inspect journey-builder-dev | jq '.[0].State'

stats: ## Show container stats
	docker stats journey-builder-dev journey-postgres journey-redis --no-stream

# Development shortcuts
dev: up logs ## Start and watch logs

prod-build: ## Build production image
	@echo "$(YELLOW)Building production image...$(NC)"
	docker build -t wedsync-journey-builder:latest --target runner .

prod-run: ## Run production image
	docker run -p 3000:3000 --env-file .env.production wedsync-journey-builder:latest