# CI

## CI - API (`.github/workflows/ci-api.yaml`)

### 概要

`main` ブランチへの Pull Request で `apps/api/**`・`packages/**`・`pnpm-lock.yaml` に変更があった場合に実行されるワークフロー。Lint/Format チェック・型チェック・Unitテスト・Integrationテストの 4 ジョブが並列で動く。

### ジョブ一覧

| ジョブ | 内容 |
|---|---|
| `lint-and-format` | `biome check apps/api` でコードスタイルを検証 |
| `type-check` | `error` / `schema` パッケージのビルドと Prisma クライアント生成後に `pnpm --filter api run type-check` を実行 |
| `unit-test` | 同上の前準備後に `pnpm --filter api run test:coverage` でカバレッジ付きテストを実行 |
| `integration-test` | `postgres:16` サービスコンテナ起動・マイグレーション適用後に `pnpm --filter api run test:integration` でHTTPエンドポイント〜実DBを一気通貫に検証 |

---

## CI - Web (`.github/workflows/ci-web.yaml`)

### 概要

`main` ブランチへの Pull Request で `apps/web/**`・`apps/api/**`・`packages/**`・`pnpm-lock.yaml` に変更があった場合に実行されるワークフロー。Lint/Format チェック・型チェック・ユニットテストの 3 ジョブが並列で動く。

`apps/web` は Hono API のルート型（`AppType`）を `hc<AppType>()` の型付きクライアントとして参照しているため、`apps/api` の変更にも反応し、型チェック・テストの前に `apps/api` 側もビルドする。

### ジョブ一覧

| ジョブ | 内容 |
|---|---|
| `lint-and-format` | `pnpm --filter web run lint`（`biome check`）でコードスタイルを検証 |
| `type-check` | `error` / `schema` / `auth` パッケージのビルド、Prisma クライアント生成、`api` パッケージのビルド後に `pnpm --filter web run type-check` を実行 |
| `unit-test` | 同上の前準備後に `pnpm --filter web run test:coverage` でカバレッジ付きテストを実行 |

---

## CI - Mobile (`.github/workflows/ci-mobile.yaml`)

### 概要

`main` ブランチへの Pull Request で `apps/mobile/**` に変更があった場合に実行されるワークフロー。Lint/Format チェック・型チェック・ユニットテストの 3 ジョブが並列で動く。

### ジョブ一覧

| ジョブ | 内容 |
|---|---|
| `lint-and-format` | `pnpm --filter mobile run lint`（`biome check`）でコードスタイルを検証 |
| `type-check` | `pnpm --filter mobile run type-check` で型検証 |
| `unit-test` | `pnpm --filter mobile run test:coverage` でカバレッジ付きテストを実行 |

---

## CI - Infra (`.github/workflows/ci-infra.yaml`)

### 概要

`main` ブランチへの Pull Request で `infra/**` に変更があった場合に実行されるワークフロー。AWS CDK コードを対象に Lint/Format チェック・型チェック・ユニットテストの 3 ジョブが並列で動く。

### ジョブ一覧

| ジョブ | 内容 |
|---|---|
| `lint-and-format` | `biome check infra` でコードスタイルを検証 |
| `type-check` | `pnpm --filter infra run type-check` で型検証 |
| `unit-test` | `pnpm --filter infra run test:coverage` でカバレッジ付きテストを実行 |

---

## CI - YAML Format (`.github/workflows/ci-yaml-format.yaml`)

### 概要

Pull Request で `**/*.yml`・`**/*.yaml` に変更があった場合に実行されるワークフロー。特定のアプリに紐づかないリポジトリ横断のYAMLファイル（GitHub Actions workflow、`.devcontainer` の compose ファイル、`pnpm-workspace.yaml` など）を対象に、Prettier によるフォーマットチェックを行う。

### ジョブ一覧

| ジョブ | 内容 |
|---|---|
| `yaml-format-check` | `make yaml-format-check`（`prettier --check "**/*.{yml,yaml}"`）でYAMLファイルのフォーマットを検証 |

---

## CI - Static Checks (`.github/workflows/ci-static-checks.yaml`)

### 概要

`main` ブランチへの Pull Request で常に実行される、特定のアプリに紐づかないリポジトリ横断の静的解析ワークフロー（path フィルタなし）。未使用コードチェックと依存関係ルールチェックの 2 ジョブが並列で動く。

### ジョブ一覧

| ジョブ | 内容 |
|---|---|
| `unused-check` | `pnpm run unused-check`（`knip --no-config-hints`）で未使用ファイル・依存関係・exports を検出 |
| `dependency-check` | `pnpm run dependency-check` で `apps/api` + `packages` + `infra`・`apps/web`・`apps/mobile` をそれぞれ dependency-cruiser で検証し、循環参照や devDependencies への不正な依存を検出 |

---

## E2E テスト (`.github/workflows/e2e.yaml`)

### 概要

`main` ブランチへの Pull Request で `apps/web/**` または `apps/api/**` に変更があった場合に Playwright E2E テストを実行するワークフロー（ワークフロー名: `Playwright Tests`）。タイムアウトは 60 分。GitHub Environment（`github.base_ref`）を参照して環境別の設定を適用する。

### 必要な GitHub Secrets

リポジトリの **Settings > Secrets and variables > Actions** に以下を登録する。

| Secret 名 | 必須 | 説明 |
|---|---|---|
| `E2E_USERNAME` | 必須 | E2E テスト用ユーザーのユーザー名 |
| `E2E_PASSWORD` | 必須 | E2E テスト用ユーザーのパスワード |
| `JWT_SECRET` | 任意 | JWT 署名シークレット（未設定時は `ci-jwt-secret`） |
| `AUTH_SECRET` | 任意 | Auth.js のシークレット（未設定時は `ci-auth-secret`） |

### ワークフローの実行ステップ

1. **コードのチェックアウト** (`actions/checkout@v7`)
2. **Node.js セットアップ** (`actions/setup-node@v7`, LTS バージョン)
3. **依存パッケージのインストール** (`npm install -g pnpm && pnpm install`)
4. **内部パッケージのビルド** (`packages/auth`, `packages/error`, `packages/schema`)
5. **Prisma クライアント生成** (`prisma generate`)
6. **API パッケージのビルド** (`pnpm --filter api build`)
7. **DB マイグレーション実行** (`prisma migrate deploy`)
   - PostgreSQL サービスコンテナ（`postgres:16`）をバックグラウンドで起動
   - 接続先: `postgresql://postgres:postgres@localhost:5432/test_db`
8. **API サーバー起動** (`apps/api/src/index.ts` をバックグラウンド実行)
9. **API の起動待機** (`http://localhost:3000` に最大 30 回ポーリング)
10. **E2E テストユーザー作成** (`POST /users` で `E2E_USERNAME` / `E2E_PASSWORD` のユーザーを登録)
11. **Playwright ブラウザのインストール** (`playwright install --with-deps`)
12. **Playwright テスト実行** (`apps/web` 配下)
    - `BASE_URL`: `http://localhost:3001`
    - `API_URL`: `http://localhost:3000`
13. **テストレポートのアップロード** (`apps/web/playwright-report/` を 30 日間保持、キャンセル時も実行)

### E2E テスト用環境変数（テスト実行時）

| 環境変数 | 値 |
|---|---|
| `CI` | `true` |
| `E2E_USERNAME` | Secrets から注入 |
| `E2E_PASSWORD` | Secrets から注入 |
| `BASE_URL` | `http://localhost:3001` |
| `API_URL` | `http://localhost:3000` |
| `AUTH_SECRET` | Secrets から注入（未設定時は `ci-auth-secret`） |
| `AUTH_TRUST_HOST` | `true` |

### ローカルでの事前確認

以下を確認してから PR を作成すると、CI 失敗を防ぎやすい。

```bash
# 内部パッケージのビルド
pnpm --filter auth --filter error --filter schema build

# Prisma クライアント生成
pnpm --filter db exec prisma generate

# API パッケージのビルド
pnpm --filter api build

# マイグレーション適用（ローカル DB が起動している前提）
pnpm --filter db exec prisma migrate deploy

# API サーバー起動
cd apps/api && pnpm exec tsx src/index.ts

# Playwright テスト実行
cd apps/web && pnpm exec playwright test
```

---

