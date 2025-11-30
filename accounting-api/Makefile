.PHONY: help install dev test build run clean db-setup db-migrate db-seed db-reset db-shell

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
RESET := \033[0m

help: ## Show this help message
	@echo "$(CYAN)BigBooks API - Development Commands$(RESET)"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "$(CYAN)Installing API dependencies...$(RESET)"
	npm install

dev: ## Start development server (with auto-reload)
	@echo "$(CYAN)Starting API development server...$(RESET)"
	@echo "$(GREEN)API will be available at http://localhost:3000$(RESET)"
	npm run dev

test: ## Run tests
	@echo "$(CYAN)Running API tests...$(RESET)"
	npm test

build: ## Build for production
	@echo "$(CYAN)Building API...$(RESET)"
	@echo "Note: Node.js projects typically don't require a build step"
	@echo "Dependencies are already installed. Use 'make run' to start."

run: ## Run production server
	@echo "$(CYAN)Starting API production server...$(RESET)"
	@echo "$(GREEN)API will be available at http://localhost:3000$(RESET)"
	npm start

clean: ## Clean node_modules and build artifacts
	@echo "$(CYAN)Cleaning API...$(RESET)"
	rm -rf node_modules coverage
	@echo "$(GREEN)API cleaned successfully$(RESET)"

# Database targets
db-setup: ## Setup development database (requires Docker)
	@echo "$(CYAN)Setting up development database...$(RESET)"
	docker-compose up -d
	@echo "$(GREEN)Database is running$(RESET)"

db-migrate: ## Run database migrations
	@echo "$(CYAN)Running database migrations...$(RESET)"
	npm run migrate
	@echo "$(GREEN)Migrations completed$(RESET)"

db-seed: ## Seed database with sample data
	@echo "$(CYAN)Seeding database...$(RESET)"
	npm run seed
	@echo "$(GREEN)Database seeded$(RESET)"

db-reset: ## Reset database (drop, recreate, migrate, seed)
	@echo "$(CYAN)Resetting database...$(RESET)"
	docker-compose down -v
	docker-compose up -d
	@sleep 3
	npm run migrate
	npm run seed
	@echo "$(GREEN)Database reset complete$(RESET)"

db-shell: ## Open PostgreSQL shell
	@echo "$(CYAN)Opening database shell...$(RESET)"
	docker-compose exec postgres psql -U postgres -d accounting
