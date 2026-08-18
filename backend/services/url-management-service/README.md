# url-management-service

Auth (via [better-auth](https://www.better-auth.com)), API keys, URL CRUD, and the analytics read API.

Currently implemented: email/password auth with bearer-token sessions. URL CRUD and API keys are not yet implemented.

## Auth

- `POST /api/auth/sign-up/email`, `POST /api/auth/sign-in/email` etc. — handled entirely by better-auth, mounted at `/api/auth/*`.
- Sign-in returns a session token; send it as `Authorization: Bearer <token>` on subsequent requests.
- `GET /api/me` — example protected route, returns the authenticated user.

## Running locally

```bash
cp services/url-management-service/.env.example services/url-management-service/.env
docker compose -f docker-compose.yml up -d postgres
npx @better-auth/cli migrate --cwd services/url-management-service -y
npm run dev -w services/url-management-service
```
