# 📦 Tech Stack

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![PNPM](https://img.shields.io/badge/pnpm-%234a4a4a.svg?style=for-the-badge&logo=pnpm&logoColor=f69220)
![Turborepo](https://img.shields.io/badge/Turborepo-FF1E56.svg?style=for-the-badge&logo=Turborepo&logoColor=white)
![Biome](https://img.shields.io/badge/Biome-60A5FA.svg?style=for-the-badge&logo=Biome&logoColor=white)
![Prettier](https://img.shields.io/badge/prettier-1A2C34?style=for-the-badge&logo=prettier&logoColor=F7BA3E)
![cspell](https://img.shields.io/badge/cspell-4B32C3?style=for-the-badge&logo=checkmarx&logoColor=white)
![Lefthook](https://img.shields.io/badge/Lefthook-FF1E1E.svg?style=for-the-badge&logo=Lefthook&logoColor=white)
![git-secrets](https://img.shields.io/badge/git--secrets-F05032.svg?style=for-the-badge&logo=git&logoColor=white)
![commitlint](https://img.shields.io/badge/commitlint-000000.svg?style=for-the-badge&logo=commitlint&logoColor=white)
![Knip](https://img.shields.io/badge/Knip-F56E0F.svg?style=for-the-badge&logo=Knip&logoColor=white)
![dependency-cruiser](https://img.shields.io/badge/dependency--cruiser-3E863D.svg?style=for-the-badge)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Shadcn/ui](https://img.shields.io/badge/shadcn/ui-%23000000?style=for-the-badge&logo=shadcnui&logoColor=white)
![Radix UI](https://img.shields.io/badge/Radix%20UI-161618.svg?style=for-the-badge&logo=radixui&logoColor=white)
![React Hook Form](https://img.shields.io/badge/React%20Hook%20Form-%23EC5990.svg?style=for-the-badge&logo=reacthookform&logoColor=white)
![TanStack](https://img.shields.io/badge/TanStack-000000.svg?style=for-the-badge&logo=TanStack&logoColor=white)
![Auth.js](https://img.shields.io/badge/Auth.js-000000?style=for-the-badge&logo=authjs&logoColor=white)
![React Native](https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![NativeWind](https://img.shields.io/badge/NativeWind-38BDF8.svg?style=for-the-badge)
![Hono](https://img.shields.io/badge/Hono-E36002.svg?style=for-the-badge&logo=Hono&logoColor=white)
![bcrypt](https://img.shields.io/badge/bcrypt-338033.svg?style=for-the-badge)
![JWT](https://img.shields.io/badge/JWT-000000.svg?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![pino](https://img.shields.io/badge/pino-687634.svg?style=for-the-badge&logo=pino&logoColor=white)
![Zod](https://img.shields.io/badge/zod-%233068b7.svg?style=for-the-badge&logo=zod&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Vitest](https://img.shields.io/badge/-Vitest-252529?style=for-the-badge&logo=vitest&logoColor=FCC72B)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)
![Storybook](https://img.shields.io/badge/Storybook-FF4785?style=for-the-badge&logo=storybook&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![Dependabot](https://img.shields.io/badge/dependabot-025E8C?style=for-the-badge&logo=dependabot&logoColor=white)

## 🧠 Shared configuration & language
- **Language**: TypeScript (unified across the whole repo)
- **Runtime**: Node.js
- **Package manager**: pnpm
- **Monorepo management**: Turborepo
- **Formatting / static analysis**: Biome (apps and packages in general), Prettier (YAML files only)
- **Shared config**: Biome / tsconfig / vitest configs are centralized in `packages/config`
- **Spell checking**: cspell
- **Unused code detection**: Knip (detects unused files, dependencies, and exports)
- **Dependency rule enforcement**: dependency-cruiser (detects circular references and invalid dependencies on devDependencies; `apps/web`/`apps/mobile` inherit their own config for resolving the `@/*` path alias)
- **Git hooks**: Lefthook (pre-commit: Biome check / YAML formatting / secret scanning via git-secrets / cspell; commit-msg: commitlint; pre-push: type check / unused-code check via Knip / dependency rule check via dependency-cruiser)
- **Commit message convention**: commitlint

---

## 🖥 Frontend (Web)
- **Framework**: Next.js (App Router)
- **CSS framework**: TailwindCSS v4
- **UI library**: shadcn/ui (Radix UI + class-variance-authority, icons: lucide-react)
- **Forms**: React Hook Form + Zod
- **Data fetching**: TanStack Query
- **Tables**: TanStack Table
- **Auth**: Auth.js (NextAuth v5) Credentials provider
- **Testing**:
  - Unit tests: Vitest
  - E2E tests: Playwright
  - UI documentation: Storybook

---

## 📱 Mobile
- **Framework**: React Native + Expo
- **Routing**: Expo Router (file-based)
- **CSS framework**: NativeWind (Tailwind CSS-based)
- **Forms**: React Hook Form + Zod
- **Data fetching**: TanStack Query
- **Testing**:
  - Unit tests: Vitest
  - UI documentation: Storybook

---

## 🌐 Backend (API)
- **Framework**: Hono (@hono/zod-openapi, @hono/swagger-ui)
- **Auth**: bcryptjs (password hashing) + jose (JWT signing/verification)
- **Logging**: pino + hono-pino
- **Docker support**: includes a Dockerfile for ECS deployment
- **Testing**:
  - Unit tests: Vitest
  - Integration tests: Vitest (verifies end-to-end from the HTTP endpoint through the real DB)

---

## 🛢 Database / ORM
- **Database**: PostgreSQL
- **ORM**: Prisma (connects via a Driver Adapter through `@prisma/adapter-pg`)
- **Layout**:
  - Prisma schema: `packages/db/prisma/schema.prisma`
  - Migrations: `packages/db/prisma/migrations`

---

## ☁️ Infrastructure / Deploy
- **IaC**: AWS CDK (defined under `infra/`)
- **Composition**:
  - Web: ECS + Fargate (supports Next.js/Auth.js SSR)
  - API: ECS + Fargate
  - DB: RDS PostgreSQL (private subnet)
  - Network: VPC / ALB / security groups
- **Docker**: separate definitions for dev and production
- **CI/CD**: GitHub Actions

---

## 🧪 Testing / CI / DevOps
- **Unit tests**: Vitest (Web / Mobile / API / Packages)
- **Integration tests**: Vitest (API; verifies end-to-end from the HTTP endpoint through the real DB)
- **E2E tests**: Playwright (mainly targets the Web UI)
- **CI/CD**:
  - GitHub Actions: `ci-api` (lint / type-check / unit test / integration test), `ci-web` / `ci-mobile` / `ci-infra` (lint / type-check / test), `ci-yaml-format` (YAML format validation), `ci-static-checks` (unused-code check via Knip, dependency rule check via dependency-cruiser; runs repo-wide on PRs)
  - Dependabot: automated dependency updates

---

## 💻 Development environment
- **Dev Container**: Dockerfile + docker-compose under `.devcontainer/`
- **Local setup**:
  - A local runtime environment, including the API and DB, can be started with docker-compose

---

## 📁 Package layout
- `apps/web`: Next.js App Router
- `apps/mobile`: React Native + Expo
- `apps/api`: Hono API
- `packages/db`: Prisma ORM / DB client
- `packages/auth`: shared auth validation logic using bcryptjs + Zod
- `packages/schema`: shared Zod schemas (between API and Web)
- `packages/error`: shared error type definitions
- `packages/config`: Biome / tsconfig / vitest configuration
