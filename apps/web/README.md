# web

Next.js ベースの Web アプリ。Auth.js で認証、TanStack Query でサーバー状態管理、Tailwind CSS + shadcn/ui で UI を構築します。

## 起動

モノレポのルートから `pnpm dev` で全アプリを一括起動できます。

単体で起動する場合:

```bash
cd apps/web
pnpm dev
```

## URL

| 用途 | URL |
|---|---|
| Web アプリ | http://localhost:3001 |
| Storybook | http://localhost:6006 |

## E2E テスト

[Playwright](https://playwright.dev) を使った E2E テストが `e2e/` ディレクトリに格納されています。

### ローカル実行手順

#### 1. ブラウザのインストール（初回のみ）

```bash
cd apps/web
pnpm exec playwright install
sudo pnpm exec playwright install-deps
```

#### 2. 環境変数の設定（初回のみ）

`.env.local.example` をコピーして `.env.local` を作成し、E2E テスト用の認証情報を設定します。

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して以下を設定します：

```
E2E_USERNAME=your_test_user   # テストユーザーのユーザー名（任意の値）
E2E_PASSWORD=your_password    # テストユーザーのパスワード（任意の値：8文字以上）
```

#### 3. API サーバーの起動

別ターミナルで API サーバーを起動します。

```bash
cd apps/api
pnpm dev
```

#### 4. テストユーザーの作成（初回・DB リセット後）

`.env.local` の `E2E_USERNAME` / `E2E_PASSWORD` と同じ認証情報でユーザーを作成します。

#### 5. Next.js サーバーの起動

`pnpm dev`（開発モード）では Auth.js のセッション処理が正常に動作しないため、プロダクションビルドで起動します。

```bash
cd apps/web
NODE_ENV=production pnpm exec next build && pnpm exec next start
```

> `NODE_ENV=production` を明示するのは、devcontainer 環境で `NODE_ENV=development` が設定されており、そのままビルドするとプリレンダリングに失敗するためです。

サーバーが起動済みであれば、Playwright は自動的に再利用します（`reuseExistingServer: true`）。

#### 6. テストの実行

```bash
cd apps/web
pnpm test:e2e
```

### その他の実行オプション

```bash
pnpm test:e2e:ui     # UI モードで実行（ブラウザでテストを確認しながら実行）
pnpm test:e2e:debug  # デバッグモードで実行（ステップ実行）
```

### テスト構成

| ファイル | 内容 |
|---|---|
| `e2e/global.setup.ts` | 認証セットアップ（ログイン状態を保存） |
| `e2e/auth.spec.ts` | 認証フロー（ログイン・アカウント作成・アクセス保護） |
| `e2e/todos.spec.ts` | Todo の CRUD 操作・詳細ページ |

### トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `Executable doesn't exist` | ブラウザ未インストール | `pnpm exec playwright install` を実行 |
| `Host system is missing dependencies` | システム依存ライブラリ不足 | `sudo pnpm exec playwright install-deps` を実行 |
| 認証テストが `/signin` に留まる | テストユーザーが DB に存在しない | 手順 4 でユーザーを作成 |
| CRUD テストが失敗する | API サーバーが未起動 | 手順 3 で API サーバーを起動 |
