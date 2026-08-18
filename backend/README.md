# backend

Two services — see `services/url-management-service/README.md` and
`services/redirect-service/README.md` for setup and API docs.

## Load testing

```bash
docker compose up -d
npm run dev:url-management -w . &   # or: npm run dev:url-management
npm run dev:redirect -w . &         # or: npm run dev:redirect
npm run loadtest
```

`npm run loadtest` (from `backend/`) drives both services with
[autocannon](https://github.com/mcollina/autocannon) and writes a
self-contained HTML report to `loadtest-reports/latest.html` (also saved
under a timestamped filename in the same folder — gitignored, so reports
stay local).

It exercises three scenarios:

- `GET /:shortCode` on the redirect service (Redis cache hit)
- `GET /api/v1/urls` on the management API (authenticated list)
- `POST /api/v1/urls` on the management API (authenticated create)

Each run signs in (or signs up, on the first run) a dedicated
`loadtest@fasturl.local` account, reuses one seed short URL across runs,
and deletes whatever the create scenario generated afterwards — safe to
run repeatedly without accumulating test data.

Tune it with env vars, e.g.:

```bash
DURATION=30 CONNECTIONS=100 npm run loadtest
```

| Var | Default | Meaning |
| --- | --- | --- |
| `DURATION` | `15` | Seconds per scenario |
| `CONNECTIONS` | `50` | Concurrent connections per scenario |
| `REDIRECT_URL` | `http://localhost:4000` | Redirect service base URL |
| `URL_MGMT_URL` | `http://localhost:3000` | Management service base URL |
| `DATABASE_URL` | same default as the services | Used only to clean up test rows |
