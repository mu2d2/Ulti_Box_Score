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
