# Google SSO Backend Verification Endpoint

## Purpose
This document defines the backend endpoint used to verify Google ID tokens before a user is considered authenticated in the app.

## Endpoint
- Method: POST
- Path: /api/auth/google/verify

## Request Body
```json
{
  "credential": "<google-id-token>",
  "nonce": "<client-generated-nonce>"
}
```

## Validation Performed
- GOOGLE_CLIENT_ID must be configured.
- Token signature and audience are verified using Google Auth Library.
- Token must include verified email.
- Token must be unexpired.
- Nonce must match when provided.

## Success Response
```json
{
  "teamEmail": "team@example.org",
  "teamName": "Team Name",
  "picture": "https://...",
  "authToken": "<hmac-signed-app-token>",
  "expiresAt": "2026-05-20T00:00:00.000Z"
}
```

## Error Response
- HTTP 400: malformed or missing credential.
- HTTP 401: verification failure (invalid token, nonce mismatch, unverified email, expired token).

## Environment Variables
- GOOGLE_CLIENT_ID: required, used for Google audience verification.
- APP_SESSION_SECRET: required, used to sign app auth token.
- API_PORT: optional, defaults to 8787.

## Local Development
1. Copy .env.example to .env.local and set GOOGLE_CLIENT_ID and APP_SESSION_SECRET.
2. Run API server: npm run dev:api
3. Run frontend server: npm run dev
4. Frontend proxies /api to API_PORT via Vite configuration.

## Files
- backend/server.js
- backend/auth/googleVerify.js
- src/services/apiClient.js
- src/app/App.jsx
- src/features/auth/SignInPage.jsx
- vite.config.js
