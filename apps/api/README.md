# api

Hono ベースの REST API サーバー。Prisma で PostgreSQL に接続し、Zod OpenAPI でスキーマ管理・ドキュメント自動生成を行います。

## 起動

モノレポのルートから `pnpm dev` で全アプリを一括起動できます。

単体で起動する場合:

```bash
cd apps/api
pnpm dev
```

## URL

| 用途 | URL |
|---|---|
| API | http://localhost:3000 |
| Swagger UI | http://localhost:3000/docs |
| OpenAPI JSON | http://localhost:3000/openapi.json |
