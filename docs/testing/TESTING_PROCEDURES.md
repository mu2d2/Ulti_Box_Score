# Testing Procedures

This document outlines the complete testing workflow for the Ultimate Frisbee Box Score application, including environment setup, initialization, and validation steps.

## Prerequisites

Before you begin, ensure you have:
- **Node.js** (v18 or higher)
- **PostgreSQL** (v12 or higher) running on `localhost:5432`
- **npm** (comes with Node.js)
- Valid Google OAuth credentials in `.env.local`

## Phase 1: Environment Setup

### Step 1.1: Install Dependencies

Run the following command in the project root:

```bash
npm install
```

This installs all required packages for both frontend and backend:
- express (backend API server)
- react & react-dom (frontend framework)
- pg (PostgreSQL client)
- google-auth-library (Google OAuth verification)
- vite (frontend build tool)

**Expected Output:**
```
added X packages, and audited X packages in Xms
```

### Step 1.2: Verify Environment Variables

Check that `.env.local` exists in the project root with the following required variables:

```
GOOGLE_CLIENT_ID=<your-google-client-id>
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
CLIENT_SECRET=<your-google-client-secret>
APP_SESSION_SECRET=<any-random-string>
API_PORT=8787
DATABASE_URL=postgresql://localhost:5432/ulti_box_score
```

If `.env.local` is missing, create it with the above values.

## Phase 2: Database Setup

### Step 2.1: Create PostgreSQL Database

Open a terminal and connect to PostgreSQL:

```bash
psql -U postgres
```

Create the database:

```sql
CREATE DATABASE ulti_box_score;
\q
```

**Expected Output:**
```
CREATE DATABASE
```

### Step 2.2: Apply Migrations

Run the migration script to create all tables and indexes:

```bash
npm run db:migrate
```

**Expected Output:**
```
Applying: backend/db/migrations/001_initial.sql
  ✓ done
All migrations applied.
```

### Step 2.3: Verify Database Tables

Verify the tables were created:

```bash
psql -U postgres -d ulti_box_score -c "\dt"
```

**Expected Output:**
```
                    List of relations
 Schema |          Name           | Type  | Owner
--------+-------------------------+-------+-------
 public | accounts                | table | postgres
 public | games                   | table | postgres
 public | lineup_group_members    | table | postgres
 public | lineup_groups           | table | postgres
 public | players                 | table | postgres
 public | point_results           | table | postgres
 public | points                  | table | postgres
 public | stat_events             | table | postgres
```

## Phase 3: Start Development Servers

### Step 3.1: Start the Backend API Server

Open a terminal in the project root and run:

```bash
npm run dev:api
```

**Expected Output:**
```
API server listening on http://localhost:8787
```

Leave this terminal open.

### Step 3.2: Start the Frontend Dev Server

Open a **new terminal** in the project root and run:

```bash
npm run dev
```

**Expected Output:**
```
VITE v5.4.0 running at:
  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

Leave this terminal open.

### Step 3.3: Open the Application

Open your browser and navigate to:

```
http://localhost:5173/
```

You should see the **"Ultimate Frisbee Box Score"** sign-in page.

## Phase 4: Authentication Testing

### Step 4.1: Test Google Sign-In

1. Click the **"Sign in with Google"** button on the sign-in page
2. A Google sign-in popup should appear
3. Select your Google account or sign in with your credentials
4. You should be redirected to the main application dashboard

**Expected Behavior:**
- No errors in the browser console
- No errors in the backend terminal
- Successful navigation to the application (you'll see the roster panel)

### Step 4.2: Verify Database Entry

In a new terminal, verify that your account was created in the database:

```bash
psql -U postgres -d ulti_box_score -c "SELECT id, email, team_name, created_at FROM accounts;"
```

**Expected Output:**
```
                  id                  |        email        | team_name |            created_at
--------------------------------------+---------------------+-----------+-------------------------------
 abc12345-1234-1234-1234-123456789abc | your-email@gmail.com |           | 2026-05-19 14:23:45.123456+00
```

### Step 4.3: Test Sign-Out

1. Click the **sign-out button** (⊗ icon in top right)
2. Confirm sign-out if prompted
3. You should return to the sign-in page

**Expected Behavior:**
- Auth session is cleared from browser storage
- No errors in console or terminal

## Phase 5: Core Feature Testing

### Step 5.1: Test Roster Management

1. In the **Roster** panel, enter a player name (e.g., "John Doe")
2. Click **"Add Player"**

**Expected Behavior:**
- Player appears in the roster list
- Player data is saved to the database
- Offline: Data is queued locally if backend is unreachable

### Step 5.2: Test Lineup Groups

1. In the **Lineup Groups** section, create a new group (e.g., "O-Line")
2. Select players to add to the group
3. Click **"Add to Lineup"**

**Expected Behavior:**
- Lineup group appears in the list
- Players are associated with the group

### Step 5.3: Test Game Creation

1. In the **Games** panel, click **"New Game"**
2. Enter an opponent name (e.g., "Team A")
3. Click **"Create Game"**

**Expected Behavior:**
- Game appears in the games list
- You can select a lineup and players
- Game state is initialized

### Step 5.4: Test Point Tracking

1. Select a game and a lineup
2. In the **On Field** panel, select players to track
3. Click **"Start Point"**
4. Record stat events (goals, turnovers, etc.)
5. Click **"Commit Point"**

**Expected Behavior:**
- Point appears in the point results list
- Box score updates with accurate statistics
- Data is persisted to the database or queued offline

### Step 5.5: Test Team Name Update

1. Click the team name at the top of the page
2. Edit the name (e.g., "My Ultimate Team")
3. Save the change

**Expected Behavior:**
- Team name updates in the UI
- Team name is persisted to the database

## Phase 6: Error Handling & Edge Cases

### Step 6.1: Test Missing Google Credentials

1. Temporarily remove or corrupt `VITE_GOOGLE_CLIENT_ID` from `.env.local`
2. Reload the page

**Expected Behavior:**
- Error message: "Google sign-in is not configured. Set GOOGLE_CLIENT_ID in your environment."

### Step 6.2: Test Database Connection Failure

1. Stop PostgreSQL or change `DATABASE_URL` to an invalid host
2. Try to sign in

**Expected Behavior:**
- Backend returns a 500 error
- Browser shows a user-friendly error message

### Step 6.3: Test Offline Functionality

1. While logged in, create players and games as normal
2. Open **DevTools** (F12) → **Network** tab
3. Select **"Offline"** from the throttling dropdown
4. Create a new player
5. Check the **Sync Queue** indicator

**Expected Behavior:**
- Data is queued locally (not sent to server)
- Sync queue shows pending items
- When connectivity is restored, data is automatically synced

## Phase 7: Browser Console & Network Validation

### Step 7.1: Check for Console Errors

1. Open **DevTools** (F12) → **Console** tab
2. Perform all actions from Phase 5
3. Look for red error messages

**Expected Behavior:**
- No red error messages
- Warnings are acceptable

### Step 7.2: Verify Network Requests

1. Open **DevTools** (F12) → **Network** tab
2. Filter to API requests: type `api` in the filter box
3. Perform actions that interact with the backend

**Expected Behavior:**
- All requests return **2xx or 4xx status codes** (not 5xx)
- Response payloads contain expected data
- No CORS errors

**Common Network Endpoints to Verify:**
- `POST /api/auth/google/verify` → 200 (authentication)
- `GET /api/players` → 200 (fetch players)
- `POST /api/players` → 200 (create player)
- `GET /api/games` → 200 (fetch games)
- `POST /api/sync` → 200 (sync offline changes)

## Phase 8: Performance & Data Validation

### Step 8.1: Test with Large Datasets

1. Create 50+ players
2. Create 10+ games
3. Add 100+ stat events to a game

**Expected Behavior:**
- UI remains responsive
- No browser crashes
- Page load time < 3 seconds

### Step 8.2: Verify Data Integrity

1. Create a player with specific jersey number and position
2. Create a game with stats
3. Sign out and sign back in
4. Verify all data is intact

**Expected Behavior:**
- All data is preserved
- No data loss or corruption

## Troubleshooting

### Issue: `Cannot find package pg`

**Solution:**
```bash
npm install
```

### Issue: `DATABASE_URL is not configured`

**Solution:**
- Ensure `.env.local` exists in the project root
- Verify `DATABASE_URL=postgresql://localhost:5432/ulti_box_score`

### Issue: `Connection refused` when running migrations

**Solution:**
- Start PostgreSQL: `pg_ctl -D /path/to/data -l logfile start`
- Or use: `brew services start postgresql` (macOS)

### Issue: Port 5173 or 8787 already in use

**Solution:**
```bash
# Find and kill the process
lsof -i :5173
kill -9 <PID>

# Or change the port in vite.config.js or backend/server.js
```

### Issue: Google Sign-In fails with "Nonce mismatch"

**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Verify `GOOGLE_CLIENT_ID` is correct in both `.env.local` and Google Cloud Console
- Ensure authorized redirect URIs include `http://localhost:5173`

## Summary Checklist

Before declaring the application ready for testing, verify:

- [x] `npm install` completed successfully
- [x] PostgreSQL is running
- [x] Database `ulti_box_score` created
- [x] Migrations applied (`npm run db:migrate`)
- [x] Backend server running (`npm run dev:api`)
- [x] Frontend server running (`npm run dev`)
- [x] Application accessible at `http://localhost:5173`
- [x] Google Sign-In works and creates account in database
- [x] Can create players and games
- [x] Can track points and stats
- [x] No console errors or network errors
- [x] Data persists after sign-in/sign-out cycle

Once all items are verified, the application is ready for comprehensive feature testing.
