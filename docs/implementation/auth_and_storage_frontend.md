# Auth and Team-Scoped Storage (Frontend)

## Summary
This document describes the frontend implementation added for team-scoped ownership using Google SSO.

## New Folder Organization
- src/features/auth/
  - SignInPage.jsx
- src/services/
  - authStore.js
  - googleAuth.js

## Session Flow
1. App loads saved auth session from local storage and validates session TTL.
2. If no valid session exists, SignInPage is shown.
3. User signs in using Google Identity Services.
4. App validates token claims (`email_verified`, `exp`) and nonce.
5. App hashes normalized team email using SHA-256 for scoped local keys.
6. Game state and sync queue are loaded with hashed team scope keys.
7. On sign-out, auth session is cleared and Google auto-select is disabled.

## Team-Scoped Local Keys
- Game state key prefix: ulti-box-score-state
- Queue key prefix: ulti-box-score-sync-queue
- Effective key format:
  - ulti-box-score-state:<sha256(normalized-team-email)>
  - ulti-box-score-sync-queue:<sha256(normalized-team-email)>

## Security Controls Implemented (Frontend)
- Google SSO only (no manual email entry).
- Nonce generation using `crypto.getRandomValues` and nonce claim validation.
- Token expiration check.
- Verified-email check.
- Hashed storage scope keys (SHA-256 via Web Crypto).
- Local auth session TTL enforcement.

## Updated Files and Responsibilities
- src/app/App.jsx
  - Enforces Google sign-in gate.
  - Validates Google credential claims and nonce.
  - Saves/loads state per hashed team scope key.
  - Saves/loads queue size per hashed team scope key.
  - Provides sign-out action.
- src/services/gameStore.js
  - Team-scoped state load/save.
- src/services/localQueue.js
  - Team-scoped queue read/enqueue/clear.
- src/services/authStore.js
  - Auth session load/save/clear and session validity checks.
- src/features/auth/SignInPage.jsx
  - Google sign-in bootstrap and credential handoff.
- src/services/googleAuth.js
  - Google script loader, nonce generation, JWT payload decode, SHA-256 hashing helper.
- src/app/styles.css
  - Auth page styles and sign-out button styling.

## Limitations (Current MVP Frontend)
- Google ID token signature is not verified in frontend and must be verified server-side before trusted persistence.
- Team email uniqueness and final identity verification must be enforced by backend auth.
- Queue actions are still local and not yet pushed to backend sync endpoints.

## Backend Handoff Notes
- Replace local auth session with SSO-based login tokens.
- Bind tokens to Team records keyed by team email.
- Enforce team scoping in all API handlers.
- Support idempotent queue replay to persist offline changes safely.
