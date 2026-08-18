# redirect-service

Resolves short codes to their destination and redirects.

Currently implemented: `GET /:shortCode` cache-aside against Redis with a read-only
fallback to PostgreSQL. Analytics (click tracking) is not yet implemented.

## Redirect

```bash
curl -i http://localhost:4000/my-alias
```

- `301` / `302` / `307` / `308` — redirects to the stored destination, using the URL's
  configured `redirectType`, with a `Location` header.
- `404` — unknown short code, or one that's `DISABLED`.
- `410` — short code exists but is past its `expiresAt`.

This service never writes to the `urls` table — url-management-service owns the schema
and all writes. It reads the same `url:<shortCode>` Redis cache key
url-management-service populates and invalidates, cache-aside style, so both services
stay coherent against the same Redis instance.

## Running locally

```bash
cp services/redirect-service/.env.example services/redirect-service/.env
docker compose -f docker-compose.yml up -d postgres redis
npm run dev -w services/redirect-service
```

(Needs url-management-service to have created the `urls` table first — see its README.)
