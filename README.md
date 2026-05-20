# Ulti_Box_Score
Web App for Ultimate Frisbee Box Score service

## Documentation
- MVP requirements: docs/plans/mvp_requirements.md
- Team ownership and auth requirements: docs/requirements/team_scope_auth_requirements.md
- Frontend auth and storage implementation notes: docs/implementation/auth_and_storage_frontend.md
- Google SSO backend endpoint: docs/implementation/google_sso_backend_endpoint.md

## Environment
- Copy .env.example to .env.local and set GOOGLE_CLIENT_ID.
- Set APP_SESSION_SECRET to a long random secret for auth token signing.

## Run
- Frontend: npm run dev
- Auth API: npm run dev:api

## PostgreSQL Database

### Prerequisites
- PostgreSQL 14+ installed and running locally, or a hosted instance (Railway, Render, Supabase).
- A database named `ulti_box_score` created:
	```
	createdb ulti_box_score
	```

### Setup
1. Copy `.env.example` to `.env.local` and fill in all values including `DATABASE_URL`.
2. Install dependencies (includes the `pg` driver):
	 ```
	 npm install
	 ```
3. Run migrations to create all tables:
	 ```
	 npm run db:migrate
	 ```
4. Start the API server and the frontend dev server in separate terminals:
	 ```
	 npm run dev:api
	 npm run dev
	 ```

### Environment variables
| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth client ID from Google Cloud Console |
| `VITE_GOOGLE_CLIENT_ID` | Same value, exposed to the Vite frontend |
| `APP_SESSION_SECRET` | Long random secret for HMAC-signing session tokens |
| `API_PORT` | Port the Express API server listens on (default `8787`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_SSL` | Set to `true` when connecting to a hosted provider that requires SSL |

## Backend folder structure
```
backend/
	server.js               — Express app entry point; mounts all routes
	auth/
		googleVerify.js       — Verifies Google ID tokens via google-auth-library
	db/
		pool.js               — pg connection pool (singleton)
		migrate.js            — Migration runner (run with npm run db:migrate)
		migrations/
			001_initial.sql     — Initial schema: accounts, players, games, points, stat_events, …
	middleware/
		requireAuth.js        — Bearer-token auth middleware
	routes/
		auth.js               — POST /api/auth/google/verify, PUT /api/auth/account
		players.js            — GET/POST /api/players, PUT /api/players/:id
		lineupGroups.js       — GET/POST /api/lineup-groups, PUT /api/lineup-groups/:id
		games.js              — GET/POST /api/games, PUT/DELETE /api/games/:id
		points.js             — POST /api/games/:gameId/points
		statEvents.js         — GET/POST /api/games/:gameId/stat-events, DELETE /api/stat-events/:id
		sync.js               — POST /api/sync  (offline action-queue replay)
		state.js              — GET /api/state  (full account state for hydration on login)
	utils/
		tokenUtils.js         — signSessionToken / verifySessionToken helpers
```

## Documentation
- High-level design: docs/HLD/design.md
- Postgres backend implementation: docs/implementation/postgres_backend.md
- MVP requirements: docs/plans/mvp_requirements.md
- Team ownership and auth requirements: docs/requirements/team_scope_auth_requirements.md
- Frontend auth and storage: docs/implementation/auth_and_storage_frontend.md
- Google SSO backend endpoint: docs/implementation/google_sso_backend_endpoint.md
