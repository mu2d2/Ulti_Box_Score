# Team-Scoped Ownership and Authentication Requirements

## Purpose
This document defines ownership, authentication, and persistence requirements for team-scoped data.

## Ownership Model
- All application data is team-scoped.
- A Team is uniquely linked to a team email address.
- Team email is the primary identity used for authentication and data access in MVP.
- A signed-in team can only access data owned by that team.

## Authentication Requirements
- The app must provide a sign-in page before team data is shown.
- Sign-in must use Google SSO (Google Identity Services) for MVP.
- Sign-in must require a Google account with a verified email claim.
- Team identity is derived from the authenticated Google email.
- The signed-in session must be persisted locally for app reload continuity.
- The app must provide a sign-out action that clears active session state.

## Security Requirements
- Sign-in requests must include a nonce and validate the nonce on credential response.
- The client must reject expired Google ID tokens.
- The client must require `email_verified = true` in Google ID token claims.
- Local storage scope keys must not use raw team emails directly; a SHA-256 hash of normalized email must be used for scope keys.
- Auth session lifetime must be limited (time-boxed local session).
- Server-side token verification must be implemented before production release.

## Data Isolation Requirements
- Local persisted game state must be namespaced by team email.
- Local sync queue must be namespaced by team email.
- Team A must not read Team B local data on the same device/browser profile.
- Backend persistent storage must enforce team ownership via Team foreign keys.

## Backend Data Ownership Requirements
- Team table must include:
  - team id
  - team name
  - unique team email
- Core entities must include team ownership either directly or through a game/team relationship:
  - Player
  - LineupGroup
  - Game
  - Point
  - PlayerPoint
  - StatEvent
- API authorization must scope reads and writes to the authenticated team.

## Sync and API Requirements
- Queue actions sent to backend must include enough identity/context to bind actions to the authenticated team.
- Backend endpoints must reject writes if team context does not match authenticated team.
- Queue processing must be idempotent (client-generated action id or idempotency key).

## UI Requirements
- Sign-in page must be mobile friendly.
- Main app header must show signed-in team identity.
- Main app header must include a sign-out control.

## Acceptance Criteria
- A user cannot access app data until sign-in completes.
- Data entered while signed in with team email A does not appear when signed in as team email B.
- Sign-out returns the user to the sign-in page.
- Re-sign-in restores team-scoped local state for that team.
- Existing game workflows continue to work after adding auth and team scoping.
- Google sign-in fails safely when nonce validation fails.
- Google sign-in fails safely when token is expired or email is not verified.
