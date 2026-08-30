# Testing Strategy

## Overview

| | Unit | Integration | E2E |
|---|---|---|---|
| Tool | Vitest | Vitest | Playwright |
| Target | Source code of each app/package | HTTP endpoints of `apps/api` through the real DB | User scenarios starting from `apps/web` |
| Dependencies | Only external I/O boundaries are mocked (with some exceptions for infrastructure implementations that don't need a real DB) | Real DB (Postgres) | Real DB + real API + real browser |
| Run speed | Fast | Moderate | Slow |
| CI | The `unit-test` job in `ci-api` / `ci-web` / `ci-mobile` / `ci-infra` | The `integration-test` job in `ci-api` | The `e2e` workflow |

Lower-level tests are cheaper to run and easier to pinpoint failures with, so first consider whether something can be expressed as a Unit test, and leave whatever can't be covered that way to Integration/E2E.

## Unit Test

Only external I/O boundaries (interfaces like Repository/QueryService) are mocked; every other layer is tested wired together as real objects (classicist / sociable unit test).

`apps/api`'s `presentation/http/user/handler.test.ts` is the canonical example: it loads the real routes onto `OpenAPIHono`, wires the UseCase and Domain Entity together for real, and mocks only `IUserRepository` / `IUserQueryService`. Because it sends actual HTTP requests via `app.request()` and asserts on the response, routing, validation, use-case logic, and domain logic are all verified together as a unit. Note, however, that this test file assembles its own minimal app, so it does not exercise `apps/api/src/app.ts` (the real DI composition root) itself — that's covered by the Integration tests.

In `apps/web`, the external I/O boundary is the "backend API call" (the `apiClient` in `lib/hono-client.ts`). `features/*/actions.test.ts` mocks `apiClient` and `auth()` (Auth.js's session retrieval — a boundary that depends on browser cookies and realistically can't be made real) and verifies the Server Actions' own logic (building parameters, propagating errors). `unwrap()` (the implementation that maps `apiClient` responses to error messages), on the other hand, is tested against a plain standard `Response` object with no mocking (`lib/hono-client.test.ts`).

Following the principle of "test behavior," the following two things are avoided.

- **Don't test code paths that are actually unreachable**: calling internal implementation directly (e.g. a value object's method) can reproduce any branch you like, but testing a branch that's already guarded by an upper layer (like a Zod schema) and thus never actually reached in practice verifies nothing about the system's behavior. For example, the character-length validation in `domain/user/value/username.ts` is unreachable via HTTP, so no test calls `Username.create()` directly — it's excluded from coverage requirements with `/* c8 ignore start */`/`stop` instead (the actually-reachable behavior — that sending a 31-character username to `POST /users` returns a 400 — is verified in `user/handler.test.ts`).
- **Don't do interaction-based verification against a mocked Context**: assertions like `expect(next).toHaveBeenCalled()` are a London-school technique, distinct from the Detroit-school approach of verifying state — i.e. the actual HTTP request/response. `infrastructure/auth/jwtMiddleware.ts` is excluded from Unit Test coverage for this reason and left to Integration Test, which can verify it via a real HTTP request against the real `app` (at present there's no domain sample with a JWT-protected route, so no Integration Test actually exercises this yet — when a protected route is added, cover it the same way with an `app.request()`-based Integration Test).

- Target: the `domain` / `application` / `presentation` layers
- Within the `infrastructure` layer, implementations that need no external dependency such as a real DB and are actually always reached (e.g. `infrastructure/auth/jwt.ts`, the JWT signing/verification logic) are also Unit Test targets
- Out of scope: `infrastructure/prisma/**` (needs a real DB, so it's an Integration Test target), `infrastructure/logger/**` (a branchless pino config wrapper), `infrastructure/auth/jwtMiddleware.ts` (can't be verified as behavior without a real Hono context, so it's an Integration Test target), `app.ts` (the Integration Test against the real DB verifies this together with the actual wiring — see `coverage.exclude` in `apps/api/vitest.config.ts`)
- Command: `pnpm --filter <app> run test` / `test:coverage`

## Integration Test

The layer that verifies the path from an HTTP endpoint all the way through to the real DB in one go (a "broad" integration test). It uses the real `app` assembled by `apps/api/src/app.ts` as-is and sends actual HTTP requests via `app.request()`. Whereas the Unit tests use a minimal app assembled independently in each test file, the Integration tests exercise the entire production DI composition root (routing, the `jwtAuth` middleware, UseCases, and real Repositories) as a whole.

- Target: the main endpoints of `apps/api` (sign-up, sign-in, user lookup). If a domain is added with a JWT-protected route implemented, its authorization is covered by Integration Tests too
  - `apps/web` is out of scope. `apiClient` is a type-safe client (`hc<AppType>()`) built on `apps/api`'s real route type `AppType`, so any change to the request/response shape is caught at compile time. Unlike the Prisma implementation (where types alone don't guarantee runtime SQL constraint violations), the "risk that's only knowable by hitting the real thing" is inherently small here, so the combination of a Unit Test (mocking `apiClient` to verify the Server Actions' own logic) + an Integration Test on the `apps/api` side (guaranteeing the API's actual behavior) + Playwright E2E (real user scenarios) is judged sufficient
- Location: placed per-resource under `apps/api/integration/` (`auth.integration.test.ts` / `user.integration.test.ts`). Following the same idea as `apps/web/e2e/` being a dedicated directory separate from the (colocated) Unit Tests, tests with different characteristics are kept out of the production code directories
- Naming convention: `*.integration.test.ts`
- Configuration: `apps/api/vitest.integration.config.ts` (targets only `integration/**/*.integration.test.ts`; the Unit Test side's `vitest.config.ts` excludes `integration/**` so it isn't picked up twice), setup in `apps/api/integration/setup.ts`
- Auth: `signUpAndSignIn()` in `integration/testAuth.ts` actually calls `POST /users` → `POST /auth/signin` to obtain a JWT. Going through the real sign-up/sign-in flow without mocking verifies JWT issuance, verification, and the middleware all together
- Data isolation: after each test, the target tables are reset with `TRUNCATE ... RESTART IDENTITY CASCADE` (`resetDatabase()` in `integration/testClient.ts`). Direct DB access is used only for auxiliary purposes such as this reset and fetching internal IDs that don't appear in the response (e.g. `ownerId`) or confirming DB-side side effects
  - Prisma has no standard mechanism for isolating tests via transaction rollback, and a Repository implementation may use a different connection per call, so wrapping only the test side in an outer transaction wouldn't work without changing the production code's implementation. The TRUNCATE approach is used for this reason
  - Since multiple test files share the same DB, file-level parallelism is disabled with `fileParallelism: false` (running in parallel would cause TRUNCATEs from multiple files to race, producing foreign-key and unique-constraint violations)
- Command: `pnpm --filter api run test:integration`
- Running locally: using the dev DB directly (the value set for `POSTGRES_DB` in `.devcontainer/.env`) would wipe dev data via TRUNCATE, so set up a dedicated test DB and write its connection info to `apps/api/.env.integration` (copy `.env.integration.example`; it's gitignored). `vitest.integration.config.ts` loads it automatically at startup, so afterward you can just run `pnpm --filter api run test:integration` without specifying environment variables each time (the same pattern `apps/web/playwright.config.ts` uses by reading `.env.local`)

  ```bash
  # Create the test DB and apply migrations (any DB name works; test_db is used here as an example)
  psql "postgresql://postgres:postgres@postgres:5432/postgres" -c "CREATE DATABASE test_db"
  DATABASE_URL="postgresql://postgres:postgres@postgres:5432/test_db" pnpm --filter db exec prisma migrate deploy

  # Set the connection info in .env.integration
  cp apps/api/.env.integration.example apps/api/.env.integration

  # Run the integration tests
  pnpm --filter api run test:integration
  ```

- CI: the `integration-test` job in `.github/workflows/ci-api.yaml`. Reuses the same `postgres:16` service container setup as `e2e.yaml`, and runs in parallel as a job separate from `unit-test`

## E2E Test

Implemented with Playwright under `apps/web/e2e/**`. Verifies the whole path — browser → Next.js → Hono API → real Postgres — in a way that closely resembles actual user actions.

- Because the run cost is high, coverage is limited to the main happy-path scenarios (sign-up, login, etc.). Branch coverage is the responsibility of Unit/Integration
- CI: `.github/workflows/e2e.yaml`. Runs Playwright with a `postgres:16` service container, a real API server, and a real Web server

## Which test verifies what

| What you want to verify | Test |
|---|---|
| Branches in domain logic/use cases, API handler responses | Unit |
| Logic in infrastructure implementations that don't need a real DB, such as JWT signing/verification | Unit |
| Server Actions' parameter building/error propagation, mapping of API response errors to messages | Unit |
| End-to-end behavior from endpoint through the real DB, DI wiring, JWT authorization middleware | Integration |
| User-facing operation flows such as screen transitions and form submission | E2E |
