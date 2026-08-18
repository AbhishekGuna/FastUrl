# frontend

The FastUrl dashboard: sign in/up, create short links, and manage them (list,
copy, edit destination, enable/disable) against `url-management-service`.

## Running locally

```bash
cp .env.example .env   # defaults already match the backend's local defaults
npm install
npm run dev
```

Runs on `http://localhost:8080` by default — matching `url-management-service`'s
default `CORS_ORIGINS`. If you change either, keep them in sync.

Requires `url-management-service` running locally (see
`../backend/services/url-management-service/README.md`).

## Design

Plain data-table / ledger grammar: the link list is the interface, not a
dashboard of widgets around one. Hairline rules, no card chrome, no shadows or
gradients. Status is always a plain word (active / disabled / expired), never
color alone. See `index.html`'s opening comment for the full direction
contract.
