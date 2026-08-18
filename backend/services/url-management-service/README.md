# url-management-service

Auth (via [better-auth](https://www.better-auth.com)), API keys, URL CRUD, and the analytics read API.

Currently implemented: email/password auth with bearer-token sessions, and URL CRUD. API keys and analytics are not yet implemented.

## Auth

- `POST /api/auth/sign-up/email`, `POST /api/auth/sign-in/email` etc. — handled entirely by better-auth, mounted at `/api/auth/*`.
- Sign-in returns a session token; send it as `Authorization: Bearer <token>` on subsequent requests.
- `GET /api/me` — example protected route, returns the authenticated user.

### Sign up

```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### Sign in

```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Both return a `token` in the response body (and a `set-auth-token` header).

### Access a protected route

```bash
curl http://localhost:3000/api/me \
  -H "Authorization: Bearer <token>"
```

## URLs

All endpoints require `Authorization: Bearer <token>` and are scoped to the authenticated
user — a short code that exists but belongs to someone else responds identically to one
that doesn't exist (404), to avoid leaking existence to non-owners.

### Create

```bash
curl -X POST http://localhost:3000/api/v1/urls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"destination":"https://example.com/hello","customAlias":"my-alias"}'
```

`customAlias` is optional (1-16 chars, `[A-Za-z0-9_-]`); omit it for a random Base62 code.
`expiresAt` (ISO timestamp) is also optional. Responds `201` with `{ shortCode, shortUrl, destination, expiresAt }`.

### List your URLs

```bash
curl http://localhost:3000/api/v1/urls -H "Authorization: Bearer <token>"
```

Supports `?limit=&offset=` query params (default `limit=20, offset=0`).

### Get one

```bash
curl http://localhost:3000/api/v1/urls/my-alias -H "Authorization: Bearer <token>"
```

### Update

```bash
curl -X PATCH http://localhost:3000/api/v1/urls/my-alias \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"destination":"https://example.com/updated"}'
```

Accepts any of `destination`, `status` (`ACTIVE`/`DISABLED`), `expiresAt`.

### Delete

```bash
curl -X DELETE http://localhost:3000/api/v1/urls/my-alias -H "Authorization: Bearer <token>"
```

Soft delete — sets `status: DISABLED` rather than removing the row, so the redirect
service can still resolve the code to a clear "gone" response. `204` on success, `404`
if the code doesn't exist or isn't yours.

Creates/updates/deletes populate or invalidate a `url:<shortCode>` Redis cache key,
cache-aside style, for the redirect service to read from once it exists.

## Hardening

- `helmet` and `@fastify/cors` (origin from `CORS_ORIGINS`, also used as better-auth's `trustedOrigins`) are registered on every response.
- `@fastify/rate-limit`: 300 req/min per IP globally; `/api/auth/*` is tightened to 10 req/min per IP; `POST /api/v1/urls` additionally allows 30 creates/min per account (Redis-backed, so it survives restarts).
- Refuses to boot with the default `BETTER_AUTH_SECRET` when `NODE_ENV=production`.
- Unhandled errors return a generic `500` to the client and log the real error server-side, instead of echoing internal messages.

## Running locally

```bash
cp services/url-management-service/.env.example services/url-management-service/.env
docker compose -f docker-compose.yml up -d postgres redis
npx @better-auth/cli migrate --cwd services/url-management-service --config src/infrastructure/auth/auth.ts -y
npm run dev -w services/url-management-service
```

(`npx @better-auth/cli migrate` sets up better-auth's own tables — the `urls` table this
service owns is created automatically on startup.)
