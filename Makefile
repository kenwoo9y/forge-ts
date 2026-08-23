-include .devcontainer/.env

.PHONY: help lint-check lint-fix format-check format-fix biome-format-check biome-format-fix yaml-format-check check check-fix biome-check biome-check-fix secrets-scan psql migrate-generate migrate aws-login cdk-bootstrap
.DEFAULT_GOAL := help

lint-check: ## Run lint check
	pnpm exec biome lint .

lint-fix: ## Run lint fix
	pnpm exec biome lint --write .

format-check: biome-format-check yaml-format-check ## Run all format checks (Biome + YAML)

format-fix: biome-format-fix ## Run all format fixes (Biome + YAML)
	pnpm run format:yaml

biome-format-check: ## Run Biome format check
	pnpm exec biome format .

biome-format-fix: ## Run Biome format fix
	pnpm exec biome format --write .

yaml-format-check: ## Run YAML format check
	pnpm exec prettier --check "**/*.{yml,yaml}"

check: biome-check yaml-format-check ## Run all checks (Biome lint+format + YAML)

check-fix: biome-check-fix ## Run all check fixes (Biome lint+format + YAML)
	pnpm run format:yaml

biome-check: ## Run Biome check (lint + format)
	pnpm exec biome check .

biome-check-fix: ## Run Biome check fix (lint + format)
	pnpm exec biome check --write .

secrets-scan: ## Run AWS Git Secrets Scan
	git secrets --scan

psql: ## Access PostgreSQL Database
	psql -h postgres -U $(POSTGRES_USER) -d $(POSTGRES_DB)

migrate-generate:  ## Generate migration
	cd packages/db && npx prisma migrate dev --create-only

migrate:  ## Execute migration
	cd packages/db && npx prisma migrate dev

aws-login: ## Login to AWS
	@test -n "$(SSO_SESSION)" || (echo "Error: SSO_SESSION is not set. Please configure .devcontainer/.env"; exit 1)
	@bash .devcontainer/setup-aws.sh
	aws sso login --sso-session=$(SSO_SESSION)

cdk-bootstrap: ## Bootstrap CDK for AWS account/region (requires aws-login first)
	@test -n "$(SSO_ACCOUNT_ID)" || (echo "Error: SSO_ACCOUNT_ID is not set. Please configure .devcontainer/.env"; exit 1)
	@test -n "$(SSO_REGION)" || (echo "Error: SSO_REGION is not set. Please configure .devcontainer/.env"; exit 1)
	cd infra && pnpm exec cdk bootstrap aws://$(SSO_ACCOUNT_ID)/$(SSO_REGION)

help: ## Show options
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'