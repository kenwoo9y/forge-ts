# Authentication

## Architecture overview

```
[Browser]
    │ username / password
    ▼
[Auth.js (Next.js)]  ─── POST /auth/signin ──▶ [Hono API]
    │                                               │ bcrypt verification
    │ ◀── { token, username } ───────────────────── │ JWT signing via jose
    │
    │ Stores apiToken in the NextAuth session (JWT)
    │
    │ On API requests: Authorization: Bearer <token>
    ▼
[Hono API]
    │ Verifies the Bearer JWT via jwtMiddleware
    ▼
[DB (Prisma / PostgreSQL)]
```

## Protected routes

| Target | Protection level |
|---|---|
| `POST /auth/signin` | Public |
| `POST /users` | Public (sign-up) |
| `GET /users/:username` | Public |
| `/` (Web) | Requires an authenticated session |

Currently there are no JWT-required endpoints on the API side (the template's sample domain has been removed). `jwtAuth()` in `infrastructure/auth/jwtMiddleware.ts` is kept as a reusable auth foundation that works regardless of domain, so when you add a route you want to protect, wire it in with the following pattern.

```ts
app.use('/protected-resource', jwtAuth(jwtSecret));
app.use('/protected-resource/*', jwtAuth(jwtSecret));
```

See the Swagger UI (`http://localhost:3000/docs`) for the request/response spec of the auth endpoints (`POST /auth/signin` / `POST /users`). Passwords are hashed with bcrypt (salt rounds: 12) before being stored, and JWTs expire after 24 hours.

## Web pages

Uses the Credentials provider of [Auth.js (NextAuth v5)](https://authjs.dev/).

| Path | Description |
|---|---|
| `/signin` | Sign-in page (redirect target when unauthenticated) |
| `/signup` | Account creation page |
| `/` | Accessible only to authenticated users (home, placeholder) |

Access to protected routes is checked via `proxy.ts` (`config.matcher`) based on whether a session exists.

## Getting the session

```ts
// Server component
import { auth } from "@/auth";
const session = await auth();
const token = session?.apiToken;

// Client component
import { useSession } from "next-auth/react";
const { data: session } = useSession();
const token = session?.apiToken;
```
