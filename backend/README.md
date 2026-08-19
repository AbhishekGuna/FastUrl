# FastUrl Backend

The backend of FastUrl is a microservices architecture built with Node.js, Fastify, and TypeScript, backed by PostgreSQL and Redis.

## Services

The backend is split into three specialized services:

1. **URL Management Service** (`services/url-management-service`): Handles user authentication and CRUD operations for links.
2. **Redirect Service** (`services/redirect-service`): Optimized for fast URL resolution and redirecting users. It publishes click events to a Redis Stream.
3. **Analytics Service** (`services/analytics-service`): Consumes click events from Redis Streams, processes them, and serves analytical data (time-series, referrers, locations, devices) to the frontend.

See the `README.md` inside each service's directory for specific setup and API documentation.

## Running Locally

To run the backend, you first need the shared infrastructure (PostgreSQL and Redis):

```bash
docker compose up -d
```

Then, you can start all services concurrently (or start them individually from their directories):

```bash
npm run dev:url-management -w . &
npm run dev:redirect -w . &
npm run dev:analytics -w . &
```

## Load Testing

The backend includes a load testing suite using [autocannon](https://github.com/mcollina/autocannon) that exercises the core paths and generates an HTML report in `loadtest-reports/latest.html`.

```bash
# Ensure infrastructure and services are running, then:
npm run loadtest
```

The test covers:
- `GET /:shortCode` on the redirect service (Redis cache hit)
- `GET /api/v1/urls` on the management API (authenticated list)
- `POST /api/v1/urls` on the management API (authenticated create)

You can customize the test with environment variables:

```bash
DURATION=30 CONNECTIONS=100 npm run loadtest
```

| Var | Default | Meaning |
| --- | --- | --- |
| `DURATION` | `15` | Seconds per scenario |
| `CONNECTIONS` | `50` | Concurrent connections per scenario |
| `REDIRECT_URL` | `http://localhost:4000` | Redirect service base URL |
| `URL_MGMT_URL` | `http://localhost:3000` | Management service base URL |
| `DATABASE_URL` | | Used to clean up test rows |
