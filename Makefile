.PHONY: help install install-api install-ui dev dev-api dev-ui test test-api test-ui build build-api build-ui run run-api run-ui clean clean-api clean-ui stop stop-api stop-ui db-setup db-migrate db-seed db-reset

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RESET := \033[0m

help: ## Show this help message
	@echo "$(CYAN)╔════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)║       BigBooks - Accounting Application           ║$(RESET)"
	@echo "$(CYAN)╚════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(YELLOW)Standard Commands (work in root or subdirectories):$(RESET)"
	@echo "  $(CYAN)make install$(RESET)    - Install all dependencies"
	@echo "  $(CYAN)make dev$(RESET)        - Start development servers (both API & UI)"
	@echo "  $(CYAN)make test$(RESET)       - Run all tests"
	@echo "  $(CYAN)make build$(RESET)      - Build for production"
	@echo "  $(CYAN)make run$(RESET)        - Run production servers"
	@echo "  $(CYAN)make clean$(RESET)      - Clean all build artifacts"
	@echo "  $(CYAN)make stop$(RESET)       - Stop all running servers"
	@echo ""
	@echo "$(YELLOW)Individual Service Commands:$(RESET)"
	@echo "  $(CYAN)make dev-api$(RESET)    - Start API development server only"
	@echo "  $(CYAN)make dev-ui$(RESET)     - Start UI development server only"
	@echo "  $(CYAN)make test-api$(RESET)   - Run API tests only"
	@echo "  $(CYAN)make clean-api$(RESET)  - Clean API artifacts only"
	@echo "  $(CYAN)make clean-ui$(RESET)   - Clean UI artifacts only"
	@echo ""
	@echo "$(YELLOW)Database Commands:$(RESET)"
	@echo "  $(CYAN)make db-setup$(RESET)   - Setup PostgreSQL database (Docker)"
	@echo "  $(CYAN)make db-migrate$(RESET) - Run database migrations"
	@echo "  $(CYAN)make db-seed$(RESET)    - Seed database with sample data"
	@echo "  $(CYAN)make db-reset$(RESET)   - Reset database (drop, create, migrate, seed)"
	@echo ""
	@echo "$(GREEN)Tip: Run 'make' in accounting-api/ or accounting-ui/ for service-specific commands$(RESET)"

# Installation targets
install: install-api install-ui ## Install all dependencies

install-api: ## Install API dependencies
	@cd accounting-api && $(MAKE) install

install-ui: ## Install UI dependencies
	@cd accounting-ui && $(MAKE) install

# Development targets
dev: ## Start both API and UI development servers
	@echo "$(CYAN)Starting development servers...$(RESET)"
	@echo "$(GREEN)API: http://localhost:3000$(RESET)"
	@echo "$(GREEN)UI:  http://localhost:3001$(RESET)"
	@echo "$(YELLOW)Press Ctrl+C to stop all servers$(RESET)"
	@echo ""
	@trap 'kill 0' EXIT; \
	(cd accounting-api && $(MAKE) dev) & \
	(cd accounting-ui && $(MAKE) dev) & \
	wait

dev-api: ## Start API development server only
	@cd accounting-api && $(MAKE) dev

dev-ui: ## Start UI development server only
	@cd accounting-ui && $(MAKE) dev

# Test targets
test: test-api test-ui ## Run all tests

test-api: ## Run API tests
	@cd accounting-api && $(MAKE) test

test-ui: ## Run UI tests
	@cd accounting-ui && $(MAKE) test

# Build targets
build: build-api build-ui ## Build both API and UI for production

build-api: ## Build API for production
	@cd accounting-api && $(MAKE) build

build-ui: ## Build UI for production
	@cd accounting-ui && $(MAKE) build

# Run targets (production)
run: ## Run both API and UI production servers
	@echo "$(CYAN)Starting production servers...$(RESET)"
	@echo "$(GREEN)API: http://localhost:3000$(RESET)"
	@echo "$(GREEN)UI:  http://localhost:3001$(RESET)"
	@echo "$(YELLOW)Press Ctrl+C to stop all servers$(RESET)"
	@echo ""
	@trap 'kill 0' EXIT; \
	(cd accounting-api && $(MAKE) run) & \
	(cd accounting-ui && $(MAKE) run) & \
	wait

run-api: ## Run API production server only
	@cd accounting-api && $(MAKE) run

run-ui: ## Run UI production server only
	@cd accounting-ui && $(MAKE) run

# Clean targets
clean: clean-api clean-ui ## Clean all build artifacts and dependencies

clean-api: ## Clean API build artifacts and dependencies
	@cd accounting-api && $(MAKE) clean

clean-ui: ## Clean UI build artifacts and dependencies
	@cd accounting-ui && $(MAKE) clean

# Stop targets
stop: stop-api stop-ui ## Stop all running servers

stop-api: ## Stop API server
	@echo "$(CYAN)Stopping API server...$(RESET)"
	@-pkill -f "nodemon.*accounting-api" || true
	@-pkill -f "node.*accounting-api/src/index.js" || true
	@-lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@echo "$(GREEN)API server stopped$(RESET)"

stop-ui: ## Stop UI server
	@echo "$(CYAN)Stopping UI server...$(RESET)"
	@-pkill -f "next-server.*accounting-ui" || true
	@-pkill -f "node.*next dev.*accounting-ui" || true
	@-lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@echo "$(GREEN)UI server stopped$(RESET)"

# Database targets
db-setup: ## Setup development database (requires Docker)
	@cd accounting-api && $(MAKE) db-setup

db-migrate: ## Run database migrations
	@cd accounting-api && $(MAKE) db-migrate

db-seed: ## Seed database with sample data
	@cd accounting-api && $(MAKE) db-seed

db-reset: ## Reset database (drop, recreate, migrate, seed)
	@cd accounting-api && $(MAKE) db-reset

# Legacy aliases for backward compatibility (deprecated)
start: dev ## Deprecated: Use 'make dev' instead
	@echo "$(YELLOW)Warning: 'make start' is deprecated. Use 'make dev' instead.$(RESET)"

start_api: dev-api ## Deprecated: Use 'make dev-api' instead
	@echo "$(YELLOW)Warning: 'make start_api' is deprecated. Use 'make dev-api' instead.$(RESET)"

start_ui: dev-ui ## Deprecated: Use 'make dev-ui' instead
	@echo "$(YELLOW)Warning: 'make start_ui' is deprecated. Use 'make dev-ui' instead.$(RESET)"
