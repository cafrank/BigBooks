.PHONY: help install dev test build run clean

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
RESET := \033[0m

help: ## Show this help message
	@echo "$(CYAN)BigBooks UI - Development Commands$(RESET)"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "$(CYAN)Installing UI dependencies...$(RESET)"
	npm install

dev: ## Start development server (with auto-reload)
	@echo "$(CYAN)Starting UI development server...$(RESET)"
	@echo "$(GREEN)UI will be available at http://localhost:3001$(RESET)"
	npm run dev

test: ## Run tests
	@echo "$(CYAN)Running UI tests...$(RESET)"
	@echo "Note: No tests configured yet. Run 'npm test' to add tests."

build: ## Build for production
	@echo "$(CYAN)Building UI for production...$(RESET)"
	npm run build
	@echo "$(GREEN)UI built successfully$(RESET)"

run: ## Run production server
	@echo "$(CYAN)Starting UI production server...$(RESET)"
	@echo "$(GREEN)UI will be available at http://localhost:3001$(RESET)"
	npm start

clean: ## Clean node_modules and build artifacts
	@echo "$(CYAN)Cleaning UI...$(RESET)"
	rm -rf node_modules .next out
	@echo "$(GREEN)UI cleaned successfully$(RESET)"
