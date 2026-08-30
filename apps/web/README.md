# web

A Next.js-based web app. Uses Auth.js for authentication, TanStack Query for server-state management, and Tailwind CSS + shadcn/ui for the UI.

## Getting started

You can start all apps at once with `pnpm dev` from the monorepo root.

To run it standalone:

```bash
cd apps/web
pnpm dev
```

## URLs

| Purpose | URL |
|---|---|
| Web app | http://localhost:3001 |
| Storybook | http://localhost:6006 |

## E2E tests

E2E tests using [Playwright](https://playwright.dev) live under the `e2e/` directory.

### Running locally

#### 1. Install browsers (first time only)

```bash
cd apps/web
pnpm exec playwright install
sudo pnpm exec playwright install-deps
```

#### 2. Set environment variables (first time only)

Copy `.env.local.example` to create `.env.local`, and set the credentials used for E2E tests.

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set the following:

```
E2E_USERNAME=your_test_user   # Test user's username (any value)
E2E_PASSWORD=your_password    # Test user's password (any value, 8+ characters)
```

#### 3. Start the API server

Start the API server in a separate terminal.

```bash
cd apps/api
pnpm dev
```

#### 4. Create the test user (first time, and after any DB reset)

Create a user with credentials matching `E2E_USERNAME`/`E2E_PASSWORD` from `.env.local`.

#### 5. Start the Next.js server

Auth.js's session handling doesn't work correctly under `pnpm dev` (dev mode), so start it from a production build instead.

```bash
cd apps/web
NODE_ENV=production pnpm exec next build && pnpm exec next start
```

> `NODE_ENV=production` is set explicitly because the devcontainer environment has `NODE_ENV=development` set, and building as-is would fail pre-rendering.

If the server is already running, Playwright reuses it automatically (`reuseExistingServer: true`).

#### 6. Run the tests

```bash
cd apps/web
pnpm test:e2e
```

### Other run options

```bash
pnpm test:e2e:ui     # Run in UI mode (watch the tests in the browser as they run)
pnpm test:e2e:debug  # Run in debug mode (step through)
```

### Test composition

| File | Description |
|---|---|
| `e2e/global.setup.ts` | Auth setup (saves the logged-in state) |
| `e2e/auth.spec.ts` | Auth flow (login, account creation, access protection) |

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Executable doesn't exist` | Browsers not installed | Run `pnpm exec playwright install` |
| `Host system is missing dependencies` | Missing system dependency libraries | Run `sudo pnpm exec playwright install-deps` |
| Auth tests stay on `/signin` | Test user doesn't exist in the DB | Create the user per step 4 |
| CRUD tests fail | API server not running | Start the API server per step 3 |
