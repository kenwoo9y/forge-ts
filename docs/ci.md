# CI

## CI - API (`.github/workflows/ci-api.yaml`)

`main` ブランチへの Pull Request で `apps/api/**`・`packages/**`・`pnpm-lock.yaml` に変更があった場合に実行されるワークフロー。Lint/Format チェック・型チェック・Unitテスト・Integrationテストの 4 ジョブが並列で動く。

---

## CI - Web (`.github/workflows/ci-web.yaml`)

`main` ブランチへの Pull Request で `apps/web/**`・`apps/api/**`・`packages/**`・`pnpm-lock.yaml` に変更があった場合に実行されるワークフロー。Lint/Format チェック・型チェック・ユニットテストの 3 ジョブが並列で動く。

`apps/web` は Hono API のルート型（`AppType`）を `hc<AppType>()` の型付きクライアントとして参照しているため、`apps/api` の変更にも反応し、型チェック・テストの前に `apps/api` 側もビルドする。

---

## CI - Mobile (`.github/workflows/ci-mobile.yaml`)

`main` ブランチへの Pull Request で `apps/mobile/**` に変更があった場合に実行されるワークフロー。Lint/Format チェック・型チェック・ユニットテストの 3 ジョブが並列で動く。

---

## CI - Infra (`.github/workflows/ci-infra.yaml`)

`main` ブランチへの Pull Request で `infra/**` に変更があった場合に実行されるワークフロー。AWS CDK コードを対象に Lint/Format チェック・型チェック・ユニットテストの 3 ジョブが並列で動く。

---

## CI - YAML Format (`.github/workflows/ci-yaml-format.yaml`)

Pull Request で `**/*.yml`・`**/*.yaml` に変更があった場合に実行されるワークフロー。特定のアプリに紐づかないリポジトリ横断のYAMLファイル（GitHub Actions workflow、`.devcontainer` の compose ファイル、`pnpm-workspace.yaml` など）を対象に、Prettier によるフォーマットチェックを行う。

---

## CI - Static Checks (`.github/workflows/ci-static-checks.yaml`)

`main` ブランチへの Pull Request で常に実行される、特定のアプリに紐づかないリポジトリ横断の静的解析ワークフロー（path フィルタなし）。未使用コードチェック（Knip）と依存関係ルールチェック（dependency-cruiser）の 2 ジョブが並列で動く。

---

## E2E テスト (`.github/workflows/e2e.yaml`)

`main` ブランチへの Pull Request で `apps/web/**` または `apps/api/**` に変更があった場合に Playwright E2E テストを実行するワークフロー（ワークフロー名: `Playwright Tests`）。タイムアウトは 60 分。GitHub Environment（`github.base_ref`）を参照して環境別の設定を適用する。

### 必要な GitHub Secrets

リポジトリの **Settings > Secrets and variables > Actions** に以下を登録する。

| Secret 名 | 必須 | 説明 |
|---|---|---|
| `E2E_USERNAME` | 必須 | E2E テスト用ユーザーのユーザー名 |
| `E2E_PASSWORD` | 必須 | E2E テスト用ユーザーのパスワード |
| `JWT_SECRET` | 任意 | JWT 署名シークレット（未設定時は `ci-jwt-secret`） |
| `AUTH_SECRET` | 任意 | Auth.js のシークレット（未設定時は `ci-auth-secret`） |

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
