# 認証

## アーキテクチャ概要

```
[ブラウザ]
    │ username / password
    ▼
[Auth.js (Next.js)]  ─── POST /auth/signin ──▶ [Hono API]
    │                                               │ bcrypt 検証
    │ ◀── { token, username } ───────────────────── │ jose で JWT 署名
    │
    │ NextAuth セッション (JWT) に apiToken を格納
    │
    │ API リクエスト時: Authorization: Bearer <token>
    ▼
[Hono API]
    │ jwtMiddleware で Bearer JWT を検証
    ▼
[DB (Prisma / PostgreSQL)]
```

## 保護されるルート

| 対象 | 保護レベル |
|---|---|
| `POST /auth/signin` | パブリック |
| `POST /users` | パブリック（サインアップ） |
| `GET /users/:username` | パブリック |
| `/`（Web） | 認証済みセッション必須 |

現時点では API 側に JWT 必須のエンドポイントは存在しない（テンプレートのサンプルドメインを削除したため）。`infrastructure/auth/jwtMiddleware.ts` の `jwtAuth()` はドメインを問わず再利用できる認証基盤として残しているので、保護したいルートを追加する際は以下のパターンで組み込む。

```ts
app.use('/protected-resource', jwtAuth(jwtSecret));
app.use('/protected-resource/*', jwtAuth(jwtSecret));
```

認証系エンドポイント（`POST /auth/signin` / `POST /users`）のリクエスト・レスポンス仕様は Swagger UI（`http://localhost:3000/docs`）を参照。パスワードは bcrypt（salt rounds: 12）でハッシュ化して保存され、JWT の有効期限は 24 時間。

## Web ページ

[Auth.js (NextAuth v5)](https://authjs.dev/) の Credentials プロバイダーを使用している。

| パス | 説明 |
|---|---|
| `/signin` | ログインページ（未認証時のリダイレクト先） |
| `/signup` | アカウント作成ページ |
| `/` | 認証済みユーザーのみアクセス可能（ホーム、プレースホルダー） |

保護ルートへのアクセスは `proxy.ts`（`config.matcher`）でセッションの有無をチェックする。

## セッションの取得

```ts
// サーバーコンポーネント
import { auth } from "@/auth";
const session = await auth();
const token = session?.apiToken;

// クライアントコンポーネント
import { useSession } from "next-auth/react";
const { data: session } = useSession();
const token = session?.apiToken;
```
