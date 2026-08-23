# テスト方針

## 全体像

| | Unit | Integration | E2E |
|---|---|---|---|
| ツール | Vitest | Vitest | Playwright |
| 対象 | 各app・packageのソースコード | `apps/api` のHTTPエンドポイント〜実DB | `apps/web` を起点としたユーザーシナリオ |
| 依存 | 外部I/O境界のみモック（一部、実DBが不要なInfrastructure実装は例外） | 実DB（Postgres） | 実DB + 実API + 実ブラウザ |
| 実行速度 | 速い | 中程度 | 遅い |
| CI | `ci-api` / `ci-web` / `ci-mobile` / `ci-infra` の `unit-test` ジョブ | `ci-api` の `integration-test` ジョブ | `e2e` ワークフロー |

下位のテストほど実行コストが低く原因の特定もしやすいので、まず Unit で表現できないかを検討し、それでもカバーできない範囲を Integration・E2E に任せる。

## Unit Test

外部I/O境界（Repository/QueryServiceなどのインターフェース）のみモックし、それ以外のレイヤーは実オブジェクトのまま結合してテストする（classicist / sociable unit test）。

`apps/api` の `presentation/http/task/handler.test.ts` が典型例で、`OpenAPIHono` に実際のルートを載せ、UseCase・Domain Entityも実結合したうえで、`ITaskRepository` / `ITaskQueryService` だけをモックしている。`app.request()` で実際のHTTPリクエストを投げてレスポンスを検証するため、ルーティング・バリデーション・ユースケース・ドメインロジックが一体として検証される。ただしこのテストファイルは独自に組み立てた簡易appを使っており、`apps/api/src/app.ts`（実際のDIコンポジションルート・`jwtAuth` ミドルウェアの配線）そのものは通っていない点に注意（この部分はIntegration Testの対象）。

`apps/web` では外部I/O境界は「バックエンドAPI呼び出し」（`lib/hono-client.ts` の `apiClient`）にあたる。`features/*/actions.test.ts` は `apiClient` と `auth()`（Auth.jsのセッション取得。ブラウザのCookieが前提で現実的に本物にできない境界）をモックし、Server Actions自身のロジック（パラメータの組み立て・エラーの伝播）を検証する。一方 `unwrap()`（`apiClient` のレスポンスをエラーメッセージにマッピングする実装）は標準の `Response` オブジェクトをそのまま使い、モックなしで検証する（`lib/hono-client.test.ts`）。

「振る舞いをテストする」という原則から、以下の2点は避ける。

- **実際には到達できないコードパスをテストしない**: 内部実装（値オブジェクトのメソッド等）を直接呼び出せば任意の分岐を再現できてしまうが、Zodスキーマ等の上位レイヤーで既にガードされていて実際には到達しない分岐をテストしても、システムの振る舞いは何も検証できていない。例えば `domain/user/value/username.ts` の文字数バリデーションはHTTP経由では到達しないため、`Username.create()` を直接呼ぶテストは書かず、`/* c8 ignore start */`/`stop` でカバレッジ要求から除外している（実際に到達可能な振る舞いとしては `POST /users` に31文字のユーザー名を送ると400になることを `user/handler.test.ts` で検証している）
- **モックしたContextに対する呼び出し検証（interaction-based verification）をしない**: `expect(next).toHaveBeenCalled()` のような検証はロンドン学派の手法であり、実際のHTTPリクエスト・レスポンスという状態（state）を検証するデトロイト学派とは異なる。`infrastructure/auth/jwtMiddleware.ts` はこの理由でUnit Test対象外とし、実 `app` に対する本物のHTTPリクエストで検証できるIntegration Testに任せている（`integration/task.integration.test.ts` の「JWT保護」を参照）

- 対象: `domain` / `application` / `presentation` 層
- `infrastructure` 層のうち、実DB等の外部依存を必要とせず、かつ実際に常に到達する実装（JWTの署名・検証ロジックである `infrastructure/auth/jwt.ts` など）もUnit Testの対象
- 対象外: `infrastructure/prisma/**`（実DBが必要なためIntegration Testの対象）、`infrastructure/logger/**`（分岐のないpino設定ラッパー）、`infrastructure/auth/jwtMiddleware.ts`（実Honoコンテキストがないと振る舞いとして検証できないためIntegration Testの対象）、`app.ts`（実DBに対するIntegration Testが実際の配線ごと検証する。`apps/api/vitest.config.ts` の `coverage.exclude` を参照）
- コマンド: `pnpm --filter <app> run test` / `test:coverage`

## Integration Test

HTTPエンドポイントから実DBまでを一気通貫で検証する層（"broad" integration test）。`apps/api/src/app.ts` が組み立てる実 `app` をそのまま使い、`app.request()` で実際にHTTPリクエストを投げる。Unitテストが各テストファイルで独自に組み立てた簡易appを使っていたのに対し、Integrationテストは本番と同じDIコンポジションルート（ルーティング・`jwtAuth` ミドルウェア・UseCase・実Repository）をまるごと検証する。

- 対象: `apps/api` の主要エンドポイント（サインアップ・サインイン・ユーザーCRUD・タスクCRUD、JWT保護ルートの認可も含む）
  - `apps/web` は対象外。`apiClient` は `apps/api` の実ルート型 `AppType` を使った型安全なクライアント（`hc<AppType>()`）であり、リクエスト/レスポンスの形が変わればコンパイル時に検出できる。Prismaの実装（型だけでは実行時のSQL制約違反まで保証されない）と違って「実物を叩かないと分からないリスク」がそもそも小さいため、Unit Test（`apiClient` をモックしてServer Actions自身のロジックを検証）＋`apps/api` 側のIntegration Test（APIの実際の挙動を保証）＋Playwright E2E（実際のユーザーシナリオ）の組み合わせで十分と判断している
- 配置: `apps/api/integration/` にリソース単位で配置（`auth.integration.test.ts` / `user.integration.test.ts` / `task.integration.test.ts`）。`apps/web/e2e/` が Unit Test（コロケーション）とは別の専用ディレクトリになっているのと同じ考え方で、性質の異なるテストをプロダクションコードのディレクトリから分離している
- 命名規則: `*.integration.test.ts`
- 設定: `apps/api/vitest.integration.config.ts`（`integration/**/*.integration.test.ts` のみを対象。Unit Test側の `vitest.config.ts` は `integration/**` を `exclude` して二重に拾わないようにしている）、セットアップは `apps/api/integration/setup.ts`
- 認証: `integration/testAuth.ts` の `signUpAndSignIn()` が `POST /users` → `POST /auth/signin` を実際に呼んでJWTを取得する。モックせず本物のサインアップ/サインインフローを経由することで、JWTの発行・検証・ミドルウェアまで一体で検証している
- データ分離: 各テスト後に対象テーブルを `TRUNCATE ... RESTART IDENTITY CASCADE` でリセットする（`integration/testClient.ts` の `resetDatabase()`）。DB直接アクセスはリセットと、レスポンスに現れない内部ID（`ownerId` など）の取得やDB側の副作用確認といった補助目的にのみ使う
  - Prismaにはトランザクションロールバックでテストを分離する標準機構がなく、Repository実装が呼び出しごとに別コネクションを使いうるため、テスト側だけ外側のトランザクションでラップしても本番コードの実装を変えない限り機能しない。そのためTRUNCATE方式を採用している
  - 複数テストファイルが同一DBを共有するため、`fileParallelism: false` でファイル並列実行を無効化している（並列のままだと複数ファイルのTRUNCATEが競合し、外部キー制約違反・一意制約違反が発生する）
- コマンド: `pnpm --filter api run test:integration`
- ローカル実行: 開発用DB（`forge_ts_dev`）を直接使うとTRUNCATEで開発データが消えるため、専用のテストDBを用意し、`apps/api/.env.integration`（`.env.integration.example` をコピー、gitignore対象）に接続情報を書く。`vitest.integration.config.ts` が起動時に自動で読み込むため、以降は毎回環境変数を指定しなくても `pnpm --filter api run test:integration` だけで実行できる（`apps/web/playwright.config.ts` が `.env.local` を読む方式と同じパターン）

  ```bash
  # テスト用DBを作成し、マイグレーションを適用
  psql "postgresql://postgres:postgres@postgres:5432/postgres" -c "CREATE DATABASE forge_ts_test"
  DATABASE_URL="postgresql://postgres:postgres@postgres:5432/forge_ts_test" pnpm --filter db exec prisma migrate deploy

  # 接続情報を .env.integration に設定
  cp apps/api/.env.integration.example apps/api/.env.integration

  # Integrationテストを実行
  pnpm --filter api run test:integration
  ```

- CI: `.github/workflows/ci-api.yaml` の `integration-test` ジョブ。`e2e.yaml` と同じ `postgres:16` サービスコンテナ構成を流用し、`unit-test` とは別ジョブとして並列に実行する

## E2E Test

Playwrightで `apps/web/e2e/**` に実装。ブラウザ→Next.js→Hono API→実Postgresの全経路を、実際のユーザー操作に近い形で検証する。

- 実行コストが高いため、主要な正常系シナリオ（サインアップ・ログイン・タスクCRUDなど）に絞る。分岐網羅はUnit/Integrationの責務とする
- CI: `.github/workflows/e2e.yaml`。`postgres:16` サービスコンテナ・実APIサーバー・実Webサーバーを起動してPlaywrightを実行する

## どのテストで検証するか

| 検証したいこと | テスト |
|---|---|
| ドメインロジック・ユースケースの分岐、APIハンドラのレスポンス | Unit |
| JWTの署名・検証など、実DB不要なInfrastructure実装のロジック | Unit |
| Server Actionsのパラメータ組み立て・エラー伝播、APIレスポンスのエラーメッセージ変換 | Unit |
| エンドポイント〜実DBの一気通貫の挙動、DI配線、JWT認可ミドルウェア | Integration |
| 画面遷移・フォーム送信など、ユーザーが実際に触る操作フロー | E2E |
