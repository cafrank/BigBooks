.PHONY: help install install-api install-ui start start_api start_ui test test-api build build-api build-ui clean clean-api clean-ui

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[0;36m
RESET := \033[0m

help: ## Show this help message
	@echo "$(CYAN)BigBooks - Accounting Application$(RESET)"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2}'

# Installation targets
install: install-api install-ui ## Install all dependencies

install-api: ## Install API dependencies
	@echo "$(CYAN)Installing API dependencies...$(RESET)"
	cd accounting-api && npm install

install-ui: ## Install UI dependencies
	@echo "$(CYAN)Installing UI dependencies...$(RESET)"
	cd accounting-ui && npm install

# Start targets
start: ## Start both API and UI servers (use Ctrl+C to stop both)
	@echo "$(CYAN)Starting API and UI servers...$(RESET)"
	@echo "API will be available at http://localhost:3001"
	@echo "UI will be available at http://localhost:3000"
	@echo ""
	@trap 'kill 0' EXIT; \
	(cd accounting-api && npm run dev) & \
	(cd accounting-ui && npm run dev) & \
	wait

start_api: ## Start API server only
	@echo "$(CYAN)Starting API server...$(RESET)"
	@echo "API will be available at http://localhost:3001"
	cd accounting-api && npm run dev

start_ui: ## Start UI server only
	@echo "$(CYAN)Starting UI server...$(RESET)"
	@echo "UI will be available at http://localhost:3000"
	cd accounting-ui && npm run dev

# Test targets
test: test-api ## Run all tests

test-api: ## Run API tests
	@echo "$(CYAN)Running API tests...$(RESET)"
	cd accounting-api && npm test

# Build targets
build: build-api build-ui ## Build both API and UI

build-api: ## Build API
	@echo "$(CYAN)Building API...$(RESET)"
	cd accounting-api && npm run build

build-ui: ## Build UI
	@echo "$(CYAN)Building UI...$(RESET)"
	cd accounting-ui && npm run build

# Clean targets
clean: clean-api clean-ui ## Clean all build artifacts and dependencies

clean-api: ## Clean API build artifacts and dependencies
	@echo "$(CYAN)Cleaning API...$(RESET)"
	cd accounting-api && rm -rf node_modules coverage

clean-ui: ## Clean UI build artifacts and dependencies
	@echo "$(CYAN)Cleaning UI...$(RESET)"
	cd accounting-ui && rm -rf node_modules .next

# Development database targets
db-setup: ## Setup development database (requires Docker)
	@echo "$(CYAN)Setting up development database...$(RESET)"
	cd accounting-api && docker-compose up -d

db-migrate: ## Run database migrations
	@echo "$(CYAN)Running database migrations...$(RESET)"
	cd accounting-api && npm run migrate

db-seed: ## Seed database with sample data
	@echo "$(CYAN)Seeding database...$(RESET)"
	cd accounting-api && npm run seed

db-reset: ## Reset database (drop, recreate, migrate, seed)
	@echo "$(CYAN)Resetting database...$(RESET)"
	cd accounting-api && npm run db:reset
