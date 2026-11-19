# Knowledge Gap Intelligence Platform

Full-stack project with a Spring Boot API in `backend/` and a Vite/React application in `frontend/`.

## Frontend structure

The React app uses a feature-first layout under `frontend/src/`:

```text
src/
  App.jsx
  main.jsx
  styles.css
  features/
    auth/
    department-head/
    employee/
    hr/
    manager/
    messaging/
    mentor/
    skill-assessment/
  shared/
    components/
    services/
```

Role-specific pages, APIs, styles, and components live with their feature. Shared UI and API helpers live under `shared/`. The skill-assessment feature is used by the employee dashboard.

## Requirements

- Java 17
- Maven (or the Maven wrapper in `backend/`)
- Node.js and npm
- PostgreSQL

## Local development

1. Copy `backend/.env.example` to `backend/.env` and set the database credentials and JWT secret.
2. From `backend/`, run `.\mvnw.cmd spring-boot:run` on Windows or `./mvnw spring-boot:run` on macOS/Linux.
3. Copy `frontend/.env.example` to `frontend/.env.local`.
4. From `frontend/`, run `npm ci` and then `npm run dev`.

The backend loads `backend/.env` for local development. Do not commit `.env` or `.env.local` files.

## Deployment

### Backend on Render

The root `render.yaml` defines the backend as a Docker web service. Create a Render Blueprint from this repository and provide the environment variables marked `sync: false` in the Render dashboard.

Set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `JWT_SECRET` to the production database and secret values. Set `APP_CORS_ALLOWED_ORIGIN_PATTERNS` and `APP_WS_ALLOWED_ORIGIN_PATTERNS` to the deployed Vercel origin (for example, `https://your-project.vercel.app`). Add any additional trusted preview origins explicitly if needed.

### Frontend on Vercel

Create a Vercel project using `frontend/` as its Root Directory. Set these environment variables for the deployment:

- `VITE_API_BASE_URL`: the Render backend URL followed by `/api`
- `VITE_WS_URL`: the Render backend WebSocket URL ending in `/ws`, using `wss://` for HTTPS deployments

The Vercel configuration builds the Vite app and rewrites frontend routes to `index.html`.

`VITE_` values are included in the browser bundle; never put credentials or secrets in them.

## Build checks

- Backend: from `backend/`, run `.\mvnw.cmd verify` (Windows) or `./mvnw verify` (macOS/Linux).
- Frontend: from `frontend/`, run `npm ci`, `npm run lint`, and `npm run build`.
