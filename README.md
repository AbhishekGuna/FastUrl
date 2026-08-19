# FastUrl

FastUrl is a high-performance URL shortener built with a modern, full-stack microservices architecture. It allows users to sign up, create short links (with optional custom aliases), manage their URLs, and view comprehensive analytics for their links. 

## Features

- **User Authentication**: Secure sign-up and sign-in using email/password and Bearer-token sessions.
- **URL Management**: Create, list, edit, and soft-delete short URLs.
- **Custom Aliases & Expiration**: Create customized short codes and set expiration dates for links.
- **Analytics Dashboard**: Real-time insights into URL performance, tracking clicks, referrers, locations, and device types.
- **High-Performance Redirects**: Sub-millisecond URL resolution powered by a Redis cache-aside architecture.
- **Modern UI**: A sleek, minimal dashboard frontend featuring a premium dark mode and the "Efferd" design system.

## Architecture

FastUrl is composed of a React frontend and three specialized backend microservices:

1. **Frontend**: React + Vite application managing user authentication, the URL dashboard, and analytics visualization.
2. **URL Management Service**: Handles core CRUD operations for URLs and user management.
3. **Redirect Service**: A high-throughput, latency-optimized service that resolves short codes and redirects users.
4. **Analytics Service**: Asynchronously processes click events via Redis Streams and serves aggregated analytics data.

**Tech Stack**:
- **Frontend**: React, Vite, TypeScript, Custom CSS (Efferd design system)
- **Backend**: Node.js, Fastify, TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Cache & Message Broker**: Redis

## Getting Started

To run FastUrl locally, you will need Node.js, Docker, and Docker Compose installed.

1. **Start Infrastructure**:
   ```bash
   cd backend
   docker compose up -d
   ```
   This starts the PostgreSQL database and Redis server.

2. **Start Backend Services**:
   Follow instructions in `backend/README.md` to start the three backend services.

3. **Start Frontend**:
   Follow instructions in `frontend/README.md` to run the React application.

## Deployment
FastUrl is designed to be deployed on modern cloud platforms. The backend microservices and databases are configured for Render (`render.yaml`), and the frontend is optimized for deployment on Vercel (`frontend/vercel.json`).

## License
MIT
