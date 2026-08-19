# FastUrl Frontend

The FastUrl frontend provides a sleek, modern dashboard for users to authenticate, create, and manage their short links, as well as view detailed click analytics.

## Features

- **Authentication**: Sign up, sign in, and manage sessions securely.
- **Link Management**: A powerful data-table interface to list, create, edit, and disable short URLs.
- **Analytics Dashboard**: Dedicated views for link performance, including time-series charts, location data, and device metrics.
- **Design System**: Built using the minimal, high-contrast "Efferd" design system with a premium dark mode aesthetic. Features fine-tuned typography (Geist), sleek glassmorphism, and subtle micro-animations.

## Running Locally

```bash
cp .env.example .env   # defaults match the backend's local defaults
npm install
npm run dev
```

The app runs on `http://localhost:8080` by default. This port matches the default allowed `CORS_ORIGINS` in the backend `url-management-service`.

## Environment Variables

Ensure your `.env` file points to the correct backend service URLs:
- `VITE_API_URL`: URL Management API (default: `http://localhost:3000`)
- `VITE_ANALYTICS_API_URL`: Analytics API (default: `http://localhost:3002`)

## Architecture & Styling

- **Framework**: React + Vite + TypeScript.
- **Routing**: `react-router-dom` for client-side routing.
- **Styling**: Vanilla CSS utilizing extensive CSS variables for robust theming (light/dark mode). The design explicitly avoids generic frameworks to maintain tight control over the visual identity and interaction design.
