# 📦 使用技術スタック

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

## 🧠 共通設定・言語
- **言語**: TypeScript（全体で統一）
- **実行環境**: Node.js
- **パッケージマネージャー**: pnpm
- **モノレポ管理**: Turborepo
- **コード整形・静的解析**: Biome（アプリ・パッケージ全般）、Prettier（YAMLファイルのみ）
- **共通設定**: `packages/config` に Biome / tsconfig / vitest を集約
- **スペルチェック**: cspell
- **未使用コード検出**: Knip（未使用ファイル・依存関係・exportsの検出）
- **依存関係ルール検証**: dependency-cruiser（循環参照・devDependenciesへの不正な依存の検出。`apps/web`・`apps/mobile` は `@/*` パスエイリアス解決用に個別設定を継承）
- **Gitフック**: Lefthook（pre-commit: Biome check / YAML整形 / git-secrets によるシークレットスキャン / cspell、commit-msg: commitlint、pre-push: 型チェック / Knipによる未使用コードチェック / dependency-cruiserによる依存関係ルールチェック）
- **コミットメッセージ規約**: commitlint

---

## 🖥 フロントエンド（Web）
- **フレームワーク**: Next.js（App Router）
- **CSSフレームワーク**: TailwindCSS v4
- **UIライブラリ**: shadcn/ui（Radix UI + class-variance-authority、アイコン: lucide-react）
- **フォーム**: React Hook Form + Zod
- **データフェッチ**: TanStack Query
- **テーブル**: TanStack Table
- **認証**: Auth.js（NextAuth v5）Credentials プロバイダー
- **テスト**:
  - Unitテスト: Vitest
  - E2Eテスト: Playwright
  - UIドキュメント: Storybook

---

## 📱 モバイル
- **フレームワーク**: React Native + Expo
- **ルーティング**: Expo Router（ファイルベース）
- **CSSフレームワーク**: NativeWind（Tailwind CSS ベース）
- **フォーム**: React Hook Form + Zod
- **データフェッチ**: TanStack Query
- **テスト**:
  - Unitテスト: Vitest
  - UIドキュメント: Storybook

---

## 🌐 バックエンド（API）
- **フレームワーク**: Hono（@hono/zod-openapi、@hono/swagger-ui）
- **認証**: bcryptjs（パスワードハッシュ化）+ jose（JWT 署名・検証）
- **ロギング**: pino + hono-pino
- **Docker対応**: ECSデプロイ用Dockerfileあり
- **テスト**:
  - Unitテスト: Vitest
  - Integrationテスト: Vitest（HTTPエンドポイント〜実DBを一気通貫で検証）

---

## 🛢 データベース・ORM
- **データベース**: PostgreSQL
- **ORM**: Prisma（`@prisma/adapter-pg` による Driver Adapter 経由で接続）
- **構成**:
  - Prisma schema: `packages/db/prisma/schema.prisma`
  - マイグレーション: `packages/db/prisma/migrations`

---

## ☁️ インフラ / デプロイ
- **IaC**: AWS CDK（`infra/` に定義）
- **構成**:
  - Web: ECS + Fargate（Next.js / Auth.js のSSRに対応）
  - API: ECS + Fargate
  - DB: RDS PostgreSQL（プライベートサブネット）
  - ネットワーク: VPC / ALB / セキュリティグループ
- **Docker**: Dev用・本番用をそれぞれ定義
- **CI/CD**: GitHub Actions

---

## 🧪 テスト / CI / DevOps
- **Unitテスト**: Vitest（Web / Mobile / API / Packages）
- **Integrationテスト**: Vitest（API。実DBに対してHTTPエンドポイント〜DBを一気通貫で検証）
- **E2Eテスト**: Playwright（主にWeb UI対象）
- **CI/CD**:
  - GitHub Actions: `ci-api`（lint / type-check / unit test / integration test）、`ci-web` / `ci-mobile` / `ci-infra`（lint / type-check / test）、`ci-yaml-format`（YAMLフォーマット検証）、`ci-static-checks`（Knipによる未使用コードチェック・dependency-cruiserによる依存関係ルールチェック、リポジトリ全体を対象にPR時実行）
  - Dependabot: 依存パッケージの自動更新

---

## 💻 開発環境
- **Dev Container**: `.devcontainer/` に Dockerfile + docker-compose を配置
- **ローカル環境構築**:
  - API・DBを含むローカル実行環境は docker-compose で起動可能

---

## 📁 パッケージ構成
- `apps/web`：Next.js App Router
- `apps/mobile`：React Native + Expo
- `apps/api`：Hono API
- `packages/db`：Prisma ORM / DBクライアント
- `packages/auth`：bcryptjs + Zod による認証バリデーション共通ロジック
- `packages/schema`：Zod スキーマ共有（API・Web 間）
- `packages/error`：共通エラー型定義
- `packages/config`：Biome / tsconfig / vitest 設定

---

## ディレクトリ構成
```
forge-ts/
├── apps/
│   ├── web/                          # Next.js (Webフロントエンド)
│   │   ├── app/                      # App Router
│   │   ├── components/               # 共通コンポーネント（shadcn/ui 含む）
│   │   ├── features/                 # 機能単位のモジュール
│   │   ├── lib/                      # ユーティリティ・API クライアント
│   │   ├── types/
│   │   ├── public/
│   │   ├── e2e/                      # Playwright E2Eテスト
│   │   ├── .storybook/               # Storybook 設定
│   │   ├── auth.ts                   # Auth.js 設定
│   │   ├── proxy.ts                  # API プロキシ設定
│   │   ├── declarations.d.ts
│   │   ├── .env.local.example
│   │   ├── .gitignore
│   │   ├── biome.json
│   │   ├── components.json           # shadcn/ui 設定
│   │   ├── .dependency-cruiser.cjs   # dependency-cruiser 設定（ルート設定を継承）
│   │   ├── webpack.dependency-cruiser.cjs # @/* エイリアス解決用（webpack互換の resolve 設定のみ）
│   │   ├── next.config.ts
│   │   ├── playwright.config.ts      # Playwright 設定
│   │   ├── postcss.config.mjs
│   │   ├── tailwind.config.ts
│   │   ├── vitest.config.ts
│   │   ├── vitest.shims.d.ts
│   │   ├── vitest.storybook.config.ts
│   │   ├── compose.yaml
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── README.md
│   │   └── tsconfig.json
│   ├── mobile/                       # Expo + React Native
│   │   ├── app/                      # Expo Router（ファイルベースルーティング）
│   │   ├── assets/                   # 画像・アイコン
│   │   ├── features/                 # 機能単位のモジュール
│   │   ├── lib/                      # ユーティリティ・API クライアント
│   │   ├── .storybook/               # Storybook 設定
│   │   ├── providers.tsx             # React コンテキストプロバイダー
│   │   ├── global.css                # NativeWind グローバルスタイル
│   │   ├── nativewind-env.d.ts
│   │   ├── app.json                  # Expo 設定
│   │   ├── .gitignore
│   │   ├── babel.config.js
│   │   ├── .dependency-cruiser.cjs   # dependency-cruiser 設定（ルート設定を継承）
│   │   ├── webpack.dependency-cruiser.cjs # @/* エイリアス解決用（webpack互換の resolve 設定のみ）
│   │   ├── metro.config.js
│   │   ├── postcss.config.js
│   │   ├── tailwind.config.js
│   │   ├── vitest.config.ts
│   │   ├── package.json
│   │   ├── README.md
│   │   └── tsconfig.json
│   └── api/                          # Hono（APIサーバー）
│       ├── src/
│       │   ├── application/          # ユースケース層
│       │   ├── domain/               # ドメイン層（エンティティ・値オブジェクト・リポジトリ）
│       │   ├── infrastructure/       # インフラ層（Prisma・JWT・ロガー）
│       │   ├── presentation/         # プレゼンテーション層（HTTPルーター・ハンドラー）
│       │   ├── app.ts
│       │   └── index.ts
│       ├── integration/              # Integrationテスト（HTTPエンドポイント〜実DBをリソース単位で検証）
│       ├── .dockerignore
│       ├── .env.example
│       ├── .env.integration.example
│       ├── .gitignore
│       ├── compose.yaml
│       ├── Dockerfile
│       ├── vitest.config.ts
│       ├── vitest.integration.config.ts
│       ├── package.json
│       ├── README.md
│       └── tsconfig.json
│
├── packages/
│   ├── db/                           # Prisma + PostgreSQL定義
│   │   ├── generated/prisma/         # 生成された Prisma クライアント
│   │   ├── prisma/
│   │   │   ├── migrations/
│   │   │   └── schema.prisma
│   │   ├── .env.example
│   │   ├── .gitignore
│   │   ├── prisma.config.ts
│   │   └── package.json
│   ├── auth/                         # 認証共通ロジック（bcryptjs + Zod）
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── schema/                       # Zod スキーマ共有（API・Web 間）
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── error/                        # 共通エラー型定義
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── config/                       # 各種共有設定
│       ├── biome/
│       ├── tsconfig/
│       └── vitest/
│
├── infra/                            # AWS CDK によるインフラコード
│   ├── bin/
│   │   └── infra.ts
│   ├── lib/
│   │   ├── constructs/               # 再利用可能なCDKコンストラクト
│   │   │   └── ecs-fargate-service.ts
│   │   └── stacks/                   # CDKスタック定義
│   │       ├── api-stack.ts
│   │       ├── database-stack.ts
│   │       ├── ecr-stack.ts
│   │       ├── network-stack.ts
│   │       ├── pipeline-stack.ts
│   │       └── web-stack.ts
│   ├── test/
│   │   ├── api-stack.test.ts
│   │   ├── database-stack.test.ts
│   │   ├── ecr-stack.test.ts
│   │   ├── network-stack.test.ts
│   │   ├── pipeline-stack.test.ts
│   │   └── web-stack.test.ts
│   ├── .env.example
│   ├── .gitignore
│   ├── cdk.json
│   ├── package.json
│   ├── README.md
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── docs/
│
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   │   ├── ci-api.yaml
│   │   ├── ci-web.yaml
│   │   ├── ci-mobile.yaml
│   │   ├── ci-infra.yaml
│   │   ├── ci-yaml-format.yaml
│   │   ├── ci-static-checks.yaml
│   │   ├── e2e.yaml
│   │   ├── app-deploy.yaml
│   │   └── infra-deploy.yaml
│   ├── dependabot.yaml
│   └── pull_request_template.md
│
├── .devcontainer/                    # 開発環境定義（VS Code Dev Container）
│   ├── .env.example
│   ├── compose.yaml
│   ├── compose.override.yaml
│   ├── devcontainer.json
│   ├── devcontainer-lock.json
│   ├── Dockerfile
│   └── setup-aws.sh
│
├── .biomeignore
├── .dependency-cruiser.cjs
├── .dockerignore
├── .env.template
├── .gitignore
├── .npmrc
├── .prettierignore
├── .prettierrc.json
├── biome.json
├── commitlint.config.js
├── cspell.json
├── knip.json
├── lefthook.yaml
├── Makefile
├── turbo.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── README.md
```
