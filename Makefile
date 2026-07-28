SHELL := /bin/bash
.DEFAULT_GOAL := help

# Backing services run on Apple's `container` runtime, orchestrated by this script
# (apple/container has no compose equivalent).
INFRA   := scripts/infra.sh
LOGDIR  := .logs
PIDDIR  := .pids

# Loaded so recipes can see API_PORT / WEB_PORT etc. Missing .env is fine (bootstrap creates it).
-include .env
export

API_PORT     ?= 8787
WEB_PORT     ?= 5173
LANDING_PORT ?= 4321

.PHONY: help up down restart infra infra-down deps env migrate seed servers logs ps status test lint typecheck clean nuke

help: ## Show available targets
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: env deps infra migrate servers ## Bring up everything: containers, migrations, dev servers
	@echo ""
	@echo "  pod-dex is up:"
	@echo "    landing   http://localhost:$(LANDING_PORT)"
	@echo "    web app   http://localhost:$(WEB_PORT)"
	@echo "    api       http://localhost:$(API_PORT)/health"
	@echo "    mailpit   http://localhost:8025"
	@echo "    minio     http://localhost:9001  (poddex / poddex-secret)"
	@echo ""
	@echo "  logs: make logs   |  stop: make down"

down: ## Stop dev servers and containers
	@$(MAKE) --no-print-directory stop-servers
	@$(INFRA) down
	@echo "pod-dex down."

restart: down up ## Full restart

env: ## Create .env from .env.example if absent
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example")

deps: ## Install workspace dependencies
	@pnpm install --silent

infra: ## Start Postgres, Redis, MinIO and Mailpit, then wait for health
	@$(INFRA) up

infra-down: ## Stop containers only, leave dev servers alone
	@$(INFRA) down

migrate: ## Apply database migrations
	@pnpm --filter @pod-dex/db migrate

seed: ## Load a demo workspace with generated audio and episodes (needs `make up` first)
	@pnpm --filter @pod-dex/seed start

servers: stop-servers ## Start api, worker, web and landing in the background
	@mkdir -p $(LOGDIR) $(PIDDIR)
	@pnpm --filter @pod-dex/api dev      > $(LOGDIR)/api.log 2>&1     & echo $$! > $(PIDDIR)/api.pid
	@pnpm --filter @pod-dex/worker dev   > $(LOGDIR)/worker.log 2>&1  & echo $$! > $(PIDDIR)/worker.pid
	@pnpm --filter @pod-dex/web dev      > $(LOGDIR)/web.log 2>&1     & echo $$! > $(PIDDIR)/web.pid
	@pnpm --filter @pod-dex/landing dev  > $(LOGDIR)/landing.log 2>&1 & echo $$! > $(PIDDIR)/landing.pid
	@sleep 3
	@echo "dev servers started (logs in $(LOGDIR)/)."

stop-servers:
	@if [ -d $(PIDDIR) ]; then \
		for f in $(PIDDIR)/*.pid; do \
			[ -e "$$f" ] || continue; \
			pid=$$(cat $$f); \
			pkill -P $$pid 2>/dev/null || true; \
			kill $$pid 2>/dev/null || true; \
			rm -f $$f; \
		done; \
	fi
	@lsof -ti :$(API_PORT) -ti :$(WEB_PORT) -ti :$(LANDING_PORT) 2>/dev/null | xargs kill -9 2>/dev/null || true

logs: ## Tail all dev server logs
	@tail -f $(LOGDIR)/*.log

ps: status
status: ## Show container and dev server status
	@$(INFRA) status
	@echo ""
	@for name in api worker web landing; do \
		if [ -f $(PIDDIR)/$$name.pid ] && kill -0 $$(cat $(PIDDIR)/$$name.pid) 2>/dev/null; then \
			echo "  $$name: running (pid $$(cat $(PIDDIR)/$$name.pid))"; \
		else echo "  $$name: stopped"; fi; \
	done

test: ## Run the test suite
	@pnpm test

lint: ## Run Biome
	@pnpm lint

typecheck: ## Run TypeScript across workspaces
	@pnpm typecheck

clean: ## Remove logs, pids and build output
	@rm -rf $(LOGDIR) $(PIDDIR)
	@find apps packages -name dist -type d -prune -exec rm -rf {} + 2>/dev/null || true

nuke: clean ## Tear down everything including database volumes
	@$(MAKE) --no-print-directory stop-servers
	@$(INFRA) nuke
	@echo "volumes removed."
