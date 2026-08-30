# CI

## CI - API (`.github/workflows/ci-api.yaml`)

Workflow that runs on pull requests to the `main` branch when there are changes to `apps/api/**`, `packages/**`, or `pnpm-lock.yaml`. Four jobs run in parallel: Lint/Format check, type check, unit tests, and integration tests.

---

## CI - Web (`.github/workflows/ci-web.yaml`)

Workflow that runs on pull requests to the `main` branch when there are changes to `apps/web/**`, `apps/api/**`, `packages/**`, or `pnpm-lock.yaml`. Three jobs run in parallel: Lint/Format check, type check, and unit tests.

`apps/web` references the Hono API's route type (`AppType`) as a typed client via `hc<AppType>()`, so it also reacts to changes in `apps/api` — `apps/api` is built first before type checking and testing.

---

## CI - Mobile (`.github/workflows/ci-mobile.yaml`)

Workflow that runs on pull requests to the `main` branch when there are changes to `apps/mobile/**`. Three jobs run in parallel: Lint/Format check, type check, and unit tests.

---

## CI - Infra (`.github/workflows/ci-infra.yaml`)

Workflow that runs on pull requests to the `main` branch when there are changes to `infra/**`. Three jobs run in parallel against the AWS CDK code: Lint/Format check, type check, and unit tests.

---

## CI - YAML Format (`.github/workflows/ci-yaml-format.yaml`)

Workflow that runs on pull requests when there are changes to `**/*.yml` / `**/*.yaml`. Runs a Prettier format check against repo-wide YAML files that aren't tied to a specific app (GitHub Actions workflows, the `.devcontainer` compose file, `pnpm-workspace.yaml`, etc.).

---

## CI - Static Checks (`.github/workflows/ci-static-checks.yaml`)

A repo-wide static analysis workflow (no path filter) that always runs on pull requests to the `main` branch, independent of any single app. Two jobs run in parallel: unused-code checking (Knip) and dependency-rule checking (dependency-cruiser).

---

## E2E tests (`.github/workflows/e2e.yaml`)

Workflow that runs Playwright E2E tests (workflow name: `Playwright Tests`) on pull requests to the `main` branch when there are changes to `apps/web/**` or `apps/api/**`. Timeout is 60 minutes. Applies per-environment settings based on the GitHub Environment (`github.base_ref`).

### Required GitHub Secrets

Register the following under the repository's **Settings > Secrets and variables > Actions**.

| Secret name | Required | Description |
|---|---|---|
| `E2E_USERNAME` | Required | Username of the E2E test user |
| `E2E_PASSWORD` | Required | Password of the E2E test user |
| `JWT_SECRET` | Optional | JWT signing secret (defaults to `ci-jwt-secret` if unset) |
| `AUTH_SECRET` | Optional | Auth.js secret (defaults to `ci-auth-secret` if unset) |

### E2E test environment variables (at test run time)

| Environment variable | Value |
|---|---|
| `CI` | `true` |
| `E2E_USERNAME` | Injected from Secrets |
| `E2E_PASSWORD` | Injected from Secrets |
| `BASE_URL` | `http://localhost:3001` |
| `API_URL` | `http://localhost:3000` |
| `AUTH_SECRET` | Injected from Secrets (defaults to `ci-auth-secret` if unset) |
| `AUTH_TRUST_HOST` | `true` |

### Checking locally beforehand

Checking the following before opening a PR helps avoid CI failures.

```bash
# Build the internal packages
pnpm --filter auth --filter error --filter schema build

# Generate the Prisma client
pnpm --filter db exec prisma generate

# Build the API package
pnpm --filter api build

# Apply migrations (assumes the local DB is running)
pnpm --filter db exec prisma migrate deploy

# Start the API server
cd apps/api && pnpm exec tsx src/index.ts

# Run the Playwright tests
cd apps/web && pnpm exec playwright test
```

---
