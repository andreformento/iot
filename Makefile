.PHONY: help install start dev build test test-e2e test-all clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	cd iot-api && npm install

start: ## Start API server in production mode
	cd iot-api && npm run start

dev: ## Start API server in development mode with hot reload
	cd iot-api && npm run start:dev

build: ## Build the API server
	cd iot-api && npm run build

test: ## Run unit tests
	cd iot-api && npm test

test-e2e: ## Run end-to-end tests
	cd iot-api && npm run test:e2e

test-all: ## Run all tests (unit + e2e)
	cd iot-api && npm test && npm run test:e2e

clean: ## Clean build artifacts
	cd iot-api && rm -rf dist node_modules
