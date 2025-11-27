# --- Makefile ---
.PHONY: help build up down logs migrate test clean

help:
	@echo "Available commands:"
	@echo "  make build     - Build Docker images"
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop all services"
	@echo "  make logs      - View logs"
	@echo "  make migrate   - Run database migrations"
	@echo "  make seed      - Seed database with sample data"
	@echo "  make test      - Run tests"
	@echo "  make clean     - Remove all containers and volumes"

build:
	docker-compose build

up:
	docker-compose up -d
	@echo "Services started. API available at http://localhost:3000"

down:
	docker-compose down

logs:
	docker-compose logs -f api

migrate:
	docker-compose exec api npx knex migrate:latest

seed:
	docker-compose exec api npx knex seed:run

test:
	docker-compose -f docker-compose.test.yml up --abort-on-container-exit
	docker-compose -f docker-compose.test.yml down

clean:
	docker-compose down -v
	docker system prune -f

# Development commands
dev:
	docker-compose -f docker-compose.dev.yml up

dev-down:
	docker-compose -f docker-compose.dev.yml down

shell:
	docker-compose exec api sh

db-shell:
	docker-compose exec postgres psql -U postgres -d accounting


