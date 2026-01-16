# Bidirectional Folgezettel Plugin - Makefile
# Build automation for Obsidian plugin development

PLUGIN_NAME := bidirectional-folgezettel
VAULT_PATH ?= ~/Documents/ObsidianVault
PLUGIN_DIR := $(VAULT_PATH)/.obsidian/plugins/$(PLUGIN_NAME)

.PHONY: all install build dev test test-watch test-coverage lint lint-fix clean install-plugin uninstall-plugin pre-commit help

# Default target
all: build

# Install dependencies
install:
	npm install

# Build production version
build:
	npm run build

# Development mode with watch
dev:
	npm run dev

# Run tests
test:
	npm test

# Run tests in watch mode
test-watch:
	npm run test:watch

# Run tests with coverage
test-coverage:
	npm run test:coverage

# Lint code
lint:
	npm run lint

# Lint and fix code
lint-fix:
	npm run lint:fix

# Clean build artifacts
clean:
	npm run clean
	rm -f main.js

# Install plugin to vault
install-plugin: build
	@echo "Installing plugin to $(PLUGIN_DIR)..."
	@mkdir -p $(PLUGIN_DIR)
	@cp main.js manifest.json styles.css $(PLUGIN_DIR)/
	@echo "Plugin installed. Restart Obsidian or reload plugins."

# Uninstall plugin from vault
uninstall-plugin:
	@echo "Removing plugin from $(PLUGIN_DIR)..."
	@rm -rf $(PLUGIN_DIR)
	@echo "Plugin removed."

# Pre-commit checks
pre-commit: lint test build
	@echo "All pre-commit checks passed!"

# Show help
help:
	@echo "Bidirectional Folgezettel Plugin - Available targets:"
	@echo ""
	@echo "  install          - Install npm dependencies"
	@echo "  build            - Build production version"
	@echo "  dev              - Run development mode with watch"
	@echo "  test             - Run test suite"
	@echo "  test-watch       - Run tests in watch mode"
	@echo "  test-coverage    - Run tests with coverage report"
	@echo "  lint             - Check code style"
	@echo "  lint-fix         - Fix code style issues"
	@echo "  clean            - Remove build artifacts"
	@echo "  install-plugin   - Install to Obsidian vault"
	@echo "  uninstall-plugin - Remove from Obsidian vault"
	@echo "  pre-commit       - Run all checks before commit"
	@echo ""
	@echo "Variables:"
	@echo "  VAULT_PATH       - Path to Obsidian vault (default: ~/Documents/ObsidianVault)"
	@echo ""
	@echo "Example:"
	@echo "  make install-plugin VAULT_PATH=/path/to/vault"
