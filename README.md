# forge-ts

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/node.js-22-6DA55F?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-12.3.4-%234a4a4a.svg?logo=pnpm&logoColor=f69220)
![Biome](https://img.shields.io/badge/code%20style-biome-60A5FA.svg?logo=Biome&logoColor=white)

## Documentation

- [Tech Stack](docs/tech-stack.md)
- [Infrastructure Architecture](docs/infra-architecture.md)
- [Authentication](docs/auth.md)
- [Testing Strategy](docs/testing.md)
- [CI](docs/ci.md)
- [Deploy](docs/deploy.md)

## Getting started with this template

If you cloned the repo under a different name, you can bulk-replace the project-name-derived string (`forge-ts`).

```bash
make rename NAME=my-app
```

`NAME` must be kebab-case, using only lowercase alphanumerics and hyphens (e.g. `my-app`). Passing a value with uppercase letters, spaces, or underscores will write that invalid value as-is into fields like `name` in `package.json`, so always use kebab-case.

Review the changes with `git diff` before committing.

## Getting started

```bash
pnpm install
pnpm dev
```

## Development environment (Codespaces / local)

This repository requires PostgreSQL connection info and AWS SSO settings to be passed via environment variables.

- Codespaces: set the variables below as Codespaces secrets on the repository (or organization).
- Local: create a file `.devcontainer/.env` (not committed to the repo) and define the same environment variables there. A template is available at `.devcontainer/.env.example`.

```bash
cp .devcontainer/.env.example .devcontainer/.env
# Edit .devcontainer/.env and fill in each value
```

### Setting up Codespaces secrets

1. Go to the relevant repository on GitHub.
2. Navigate to `Settings` → `Secrets and variables` → `Codespaces` → `Repository secrets`.
3. Add all of the following variables.

**PostgreSQL**

| Secret name | Description |
|---|---|
| `POSTGRES_DB` | Database name |
| `POSTGRES_USER` | Username |
| `POSTGRES_PASSWORD` | Password |

**AWS SSO**

| Secret name | Description |
|---|---|
| `SSO_SESSION` | SSO session name (any name, e.g. `my-company`) |
| `SSO_START_URL` | SSO portal URL (e.g. `https://xxxxx.awsapps.com/start`) |
| `SSO_REGION` | SSO region (e.g. `ap-northeast-1`) |
| `SSO_ACCOUNT_ID` | AWS account ID (e.g. `123456789012`) |
| `SSO_ROLE_NAME` | IAM role name to use (e.g. `AdministratorAccess`) |

After setting the secrets, create a Codespace or restart the devcontainer. Once restarted, running `make aws-login` generates `~/.aws/config` and completes AWS SSO authentication.

### Creating the Prisma environment file

Prisma needs `packages/db/.env` to connect to the DB. Copy the template and fill in the connection info.

```bash
cp packages/db/.env.example packages/db/.env
```

Edit `packages/db/.env` and set the connection info.

```
DATABASE_URL="postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>"
```

### Creating the API environment file

Set the environment variables the Hono API needs to run in `apps/api/.env`.

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and set the actual value for each variable.

```
DB_HOST=postgres
DB_PORT=5432
DB_NAME=<POSTGRES_DB>
DB_USERNAME=<POSTGRES_USER>
DB_PASSWORD=<POSTGRES_PASSWORD>
JWT_SECRET="your-secret-key"
```

`JWT_SECRET` is the secret the Hono API uses to sign and verify JWTs. Set a secure random string.

```bash
# Example generation
openssl rand -base64 32
```

### Creating the Web app environment file

`apps/web/.env.local` is required. Copy the template and set each variable.

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

```
API_URL=http://localhost:3000
AUTH_SECRET="your-secret-key"
```

- `API_URL` — the URL Auth.js's sign-in flow (server-side) uses to call the Hono API.
- `AUTH_SECRET` — the secret Auth.js uses to encrypt the JWT session. Use a value different from `JWT_SECRET`.

## Database

### Migrations

Use `make` commands to generate and run migration files.

```bash
# Generate a migration file (run after changing the schema)
make migrate-generate

# Run migrations
make migrate
```

- `make migrate-generate` generates a new migration file under `packages/db/prisma/migrations/` based on changes to `packages/db/prisma/schema.prisma` (it does not apply it, since it uses `--create-only`).
- `make migrate` runs the migrations and applies them to the local PostgreSQL database.

### DB connection

To connect directly to the local PostgreSQL database, run:

```bash
make psql
```

You'll be prompted for a password — enter the `POSTGRES_PASSWORD` value you set in `.devcontainer/.env`.

## Testing

```bash
pnpm test
```

## Deploying the AWS infrastructure

You can start with DEV and add STG/PROD incrementally. For details on the initial setup, adding STG/PROD, and the CI/CD flow, see [Deploy](docs/deploy.md); for stack composition and default resource sizes, see [Infrastructure Architecture](docs/infra-architecture.md).
