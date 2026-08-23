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

## 認証フロー

1. `/signup` でアカウントを作成（`POST /users` にパスワードを送信、API 側で bcrypt ハッシュ化して保存）
2. `/signin` でログイン → Auth.js が Hono の `POST /auth/signin` を呼び出す
3. Hono が認証成功後に JWT を発行し、Auth.js がセッションに格納
4. 以降の API リクエストでは `Authorization: Bearer <token>` ヘッダーを付与
5. Hono の JWT ミドルウェアがトークンを検証し、保護ルートへのアクセスを制御

## 保護されるルート

| 対象 | 保護レベル |
|---|---|
| `POST /auth/signin` | パブリック |
| `POST /users` | パブリック（サインアップ） |
| `GET /users/:username` | パブリック |
| `GET /tasks`, `PATCH /tasks/*`, `DELETE /tasks/*` | JWT 必須 |
| `GET /users/:username/tasks`, `POST /users/:username/tasks` | JWT 必須 |
| `/todos`（Web） | 認証済みセッション必須 |

認証系エンドポイント（`POST /auth/signin` / `POST /users`）のリクエスト・レスポンス仕様は Swagger UI（`http://localhost:3000/docs`）を参照。パスワードは bcrypt（salt rounds: 12）でハッシュ化して保存され、JWT の有効期限は 24 時間。

## Web ページ

[Auth.js (NextAuth v5)](https://authjs.dev/) の Credentials プロバイダーを使用している。

| パス | 説明 |
|---|---|
| `/signin` | ログインページ（未認証時のリダイレクト先） |
| `/signup` | アカウント作成ページ |
| `/todos` | 認証済みユーザーのみアクセス可能 |

保護ルートへのアクセスは `middleware.ts` でセッションの有無をチェックする。

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
