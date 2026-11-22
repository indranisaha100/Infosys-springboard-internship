# Knowledge Gap Intelligence Platform

Full-stack project with a Spring Boot API in `backend/` and a Vite/React application in `frontend/`.

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

The root `render.yaml` defines the backend as a Docker web service.

1. In Render, create a Blueprint from this repository.
2. Create or select a PostgreSQL database and copy its JDBC connection details.
3. Set the environment variables marked `sync: false` in the Render dashboard:

   - `DB_URL`: PostgreSQL JDBC URL, for example `jdbc:postgresql://host:5432/database`
   - `DB_USERNAME`: PostgreSQL username
   - `DB_PASSWORD`: PostgreSQL password
   - `JWT_SECRET`: a strong, random secret
   - `ADMIN_REGISTRATION_KEY`: optional admin registration key
   - `HR_SETUP_KEY`: optional HR setup key

4. After deploying the frontend, set `APP_CORS_ALLOWED_ORIGIN_PATTERNS` and `APP_WS_ALLOWED_ORIGIN_PATTERNS` to its Render URL, for example `https://knowledge-gap-frontend.onrender.com`.

The backend Dockerfile is [backend/Dockerfile](backend/Dockerfile), and the service uses port `8080` on Render. The backend URL should normally look like `https://knowledge-gap-backend.onrender.com`.

### Frontend on Render

Create a separate **Static Site** service in Render:

- **Root Directory:** `frontend`
- **Build Command:** `npm ci && npm run build`
- **Publish Directory:** `dist`

Set these environment variables before building:

- `VITE_API_BASE_URL`: the Render backend URL followed by `/api`, for example `https://knowledge-gap-backend.onrender.com/api`
- `VITE_WS_URL`: the Render backend WebSocket URL ending in `/ws`, for example `wss://knowledge-gap-backend.onrender.com/ws`

Add the following rewrite rule so React Router works on direct URLs:

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | Rewrite |

After the frontend has a final Render URL, update the backend CORS and WebSocket origin environment variables and redeploy the backend.

`VITE_` values are included in the browser bundle; never put credentials or secrets in them.

## Build checks

- Backend: from `backend/`, run `.\mvnw.cmd verify` (Windows) or `./mvnw verify` (macOS/Linux).
- Frontend: from `frontend/`, run `npm ci`, `npm run lint`, and `npm run build`.
