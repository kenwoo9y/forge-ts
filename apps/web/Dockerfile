# syntax=docker/dockerfile:1
# Build context: monorepo root (docker build -f apps/web/Dockerfile .)

# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM --platform=$BUILDPLATFORM node:26-alpine AS installer
WORKDIR /app

ENV UV_USE_IO_URING=0

RUN npm install -g pnpm@11.22.0

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/error/package.json ./packages/error/
COPY packages/schema/package.json ./packages/schema/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM installer AS builder
WORKDIR /app

# Copy workspace package sources
COPY packages/auth/src ./packages/auth/src
COPY packages/auth/tsconfig.json ./packages/auth/tsconfig.json
COPY packages/db/prisma ./packages/db/prisma
COPY packages/db/prisma.config.ts ./packages/db/prisma.config.ts
COPY packages/error/src ./packages/error/src
COPY packages/error/tsconfig.json ./packages/error/tsconfig.json
COPY packages/schema/src ./packages/schema/src
COPY packages/schema/tsconfig.json ./packages/schema/tsconfig.json

# apps/web imports the Hono API's route types (AppType) for its RPC client,
# so the API package must be built here too even though none of its runtime
# code ships in this image.
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json

# Generate Prisma client for the target platform (api build type-checks against it)
RUN DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy pnpm --filter db generate

# Build workspace packages in dependency order
RUN pnpm --filter auth build
RUN pnpm --filter error build
RUN pnpm --filter schema build
RUN pnpm --filter api build

# Copy Next.js app source
COPY apps/web ./apps/web

RUN pnpm --filter web build

# ─── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM --platform=$TARGETPLATFORM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S -G nodejs nextjs
USER nextjs

# standalone bundle already contains all server-side node_modules.
# The directory structure inside standalone mirrors the monorepo root.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Static assets must be copied separately alongside the standalone server.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

EXPOSE 3001

# server.js lives at apps/web/server.js inside the standalone bundle
CMD ["node", "apps/web/server.js"]
