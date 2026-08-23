# forge-ts

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/node.js-22-6DA55F?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11.22.0-%234a4a4a.svg?logo=pnpm&logoColor=f69220)
![Biome](https://img.shields.io/badge/code%20style-biome-60A5FA.svg?logo=Biome&logoColor=white)

TypeScript モノレポのテンプレート実装例。Hono API・Next.js Web・Expo モバイルの3アプリを Turborepo で管理しています。

## ドキュメント

- [技術スタック](docs/tech-stack.md)
- [インフラアーキテクチャ](docs/infra-architecture.md)
- [認証](docs/auth.md)
- [テスト方針](docs/testing.md)
- [CI](docs/ci.md)
- [デプロイ](docs/deploy.md)

## 起動

```bash
pnpm install
pnpm dev
```

## 開発環境 (Codespaces / ローカル)

このリポジトリでは PostgreSQL の接続情報と AWS SSO の設定を環境変数で渡す必要があります。

- Codespaces: リポジトリ（または組織）の Codespaces シークレットとして下記の変数を設定してください。
- ローカル: リポジトリにコミットしないファイル `.devcontainer/.env` を作成し、同じ環境変数を定義してください。テンプレートは `.devcontainer/.env.example` にあります。

```bash
cp .devcontainer/.env.example .devcontainer/.env
# .devcontainer/.env を編集して各値を入力
```

### Codespaces シークレットの設定手順

1. GitHub の該当リポジトリにアクセスします。
2. `Settings` → `Secrets and variables` → `Codespaces` → `Repository secrets` に移動します。
3. 以下の変数をすべて追加します。

**PostgreSQL**

| シークレット名 | 説明 |
|---|---|
| `POSTGRES_DB` | データベース名 |
| `POSTGRES_USER` | ユーザー名 |
| `POSTGRES_PASSWORD` | パスワード |

**AWS SSO**

| シークレット名 | 説明 |
|---|---|
| `SSO_SESSION` | SSO セッション名（任意の名前。例: `my-company`） |
| `SSO_START_URL` | SSO ポータル URL（例: `https://xxxxx.awsapps.com/start`） |
| `SSO_REGION` | SSO リージョン（例: `ap-northeast-1`） |
| `SSO_ACCOUNT_ID` | AWS アカウント ID（例: `123456789012`） |
| `SSO_ROLE_NAME` | 使用する IAM ロール名（例: `AdministratorAccess`） |

シークレットを設定した後、Codespace を作成するか devcontainer を再起動してください。再起動後に `make aws-login` を実行すると `~/.aws/config` が生成され、AWS SSO 認証が完了します。

### Prisma 用環境変数ファイルの作成

Prisma が DB に接続するために `packages/db/.env` が必要です。テンプレートをコピーし、接続情報を設定してください。

```bash
cp packages/db/.env.example packages/db/.env
```

`packages/db/.env` を編集し、接続情報を設定します。

```
DATABASE_URL="postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>"
```

### API 用環境変数ファイルの作成

Hono API の実行に必要な環境変数を `apps/api/.env` に設定します。

```bash
cp apps/api/.env.example apps/api/.env
```

`apps/api/.env` を編集し、各変数に実際の値を設定します。

```
DB_HOST=postgres
DB_PORT=5432
DB_NAME=<POSTGRES_DB>
DB_USERNAME=<POSTGRES_USER>
DB_PASSWORD=<POSTGRES_PASSWORD>
JWT_SECRET="your-secret-key"
```

`JWT_SECRET` は Hono API が JWT の署名・検証に使用するシークレットです。安全なランダム文字列を設定してください。

```bash
# 生成例
openssl rand -base64 32
```

### Web アプリ用環境変数ファイルの作成

`apps/web/.env.local` が必要です。テンプレートをコピーし、各変数を設定してください。

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

```
API_URL=http://localhost:3000
AUTH_SECRET="your-secret-key"
```

- `API_URL` — Auth.js のサインイン処理（サーバーサイド）が Hono API を呼び出すための URL です。
- `AUTH_SECRET` — Auth.js が JWT セッションを暗号化するためのシークレットです。`JWT_SECRET` とは別の値を設定してください。

## データベース

### マイグレーション

マイグレーションファイルの生成と実行には `make` コマンドを使用します。

```bash
# マイグレーションファイルを生成（スキーマ変更後に実行）
make migrate-generate

# マイグレーションを実行
make migrate
```

- `make migrate-generate` は `packages/db/prisma/schema.prisma` の変更を元に新しいマイグレーションファイルを `packages/db/prisma/migrations/` に生成します（`--create-only` のため、適用は行いません）。
- `make migrate` はマイグレーションを実行し、ローカルの PostgreSQL データベースに反映します。

### DB 接続

ローカルの PostgreSQL データベースに直接接続するには、以下のコマンドを実行します。

```bash
make psql
```

パスワードの入力を求められるので、`.devcontainer/.env` に設定した `POSTGRES_PASSWORD` の値を入力してください。

## テスト

```bash
pnpm test
```

## AWS インフラのデプロイ

DEV から始めて、段階的に STG・PROD を追加できます。初回セットアップ手順・STG/PROD の追加方法・CI/CD の流れの詳細は [デプロイ](docs/deploy.md) を、スタック構成・リソースサイズの既定値は [インフラアーキテクチャ](docs/infra-architecture.md) を参照してください。
