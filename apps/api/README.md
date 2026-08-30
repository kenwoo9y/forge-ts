# api

A Hono-based REST API server. Connects to PostgreSQL via Prisma, and uses Zod OpenAPI for schema management and auto-generated documentation.

## Getting started

You can start all apps at once with `pnpm dev` from the monorepo root.

To run it standalone:

```bash
cd apps/api
pnpm dev
```

## URLs

| Purpose | URL |
|---|---|
| API | http://localhost:3000 |
| Swagger UI | http://localhost:3000/docs |
| OpenAPI JSON | http://localhost:3000/openapi.json |
