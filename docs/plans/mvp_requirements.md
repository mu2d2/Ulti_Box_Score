# Minimal Viable Project Requirements

## Purpose
This document defines the detailed requirements for the first shippable version of the Ultimate Frisbee Box Score web app. The MVP should let a coach or captain track a live game quickly, offline, and with as little friction as possible.

## MVP Goal
The MVP must support live stat entry for a single team, starting from an empty game and allowing game details to be filled in later. The experience should work well on a phone or tablet at the field and should continue working without internet access.

## Primary User
- Coach or captain responsible for tracking a game live

## Core User Journey
1. User signs in with team SSO.
2. User opens or starts a game.
3. User selects the 7 players currently on the field.
4. User taps large stat buttons to record live events.
5. User optionally switches between lineup tabs to view custom player groupings.
6. User fills in opponent and game details later if needed.
7. Data syncs to the server when connectivity is available.

## In Scope
### Authentication
- Single team login
- SSO-based sign-in
- One team account per deployment for MVP

### Roster Management
- Create, view, edit, and remove players
- Store player name
- Store jersey number
- Store position
- Store age
- Store matching-player designation: MMP (male matching player) or WMP (woman matching player)
- Create named lineup groups
- Assign players to lineup groups

### Game Management
- Start a game with minimal required information
- Allow opponent, date, location, and tournament to be entered later
- Support game types for practice, scrimmage, game, and tournament
- Save game records locally while offline

### Live Stat Entry
- Track stat events individually, one event per row in the database
- Support the following stats for MVP:
  - Goals
  - Assists
  - Turnovers
  - Blocks
- Provide large touch-friendly buttons for quick entry
- Make it fast to record stats for any of the 7 players currently on the field
- Allow undo of the most recent stat event
- Allow manual correction of entered stats

### Playing Time Tracking
- Mark which 7 players are on the field for a point
- Derive Points Played from the points a player is assigned to
- Do not store Points Played as a separate editable value

### Box Score Views
- Show a box score table with players as rows and stats as columns
- Support tabs for lineup groups
- Show filtered views based on the selected lineup group
- Keep the same underlying data across all tabs

### Offline-First Behavior
- Allow stat entry without internet access
- Store changes locally on the device first
- Queue changes for sync when connectivity returns
- Show clear UI feedback for offline and pending sync state

### Reporting and History
- Display a basic game summary after the game
- Show simple stat totals by player
- Support later expansion into trend charts and historical views

## Out of Scope for MVP
- Multi-team support
- Public sharing of stats
- Advanced tournament brackets
- Complex custom stat types beyond the MVP list
- Player-level user accounts separate from the team account
- Advanced analytics dashboards
- Full drill or practice session planning tools

## Functional Requirements
### FR-1 Login
The app must allow a user to authenticate through team SSO before accessing team data.

### FR-2 Team Roster
The app must allow a user to manage a roster of players for the team.

### FR-3 Lineup Groups
The app must allow a user to define named lineup groups and assign players to them.

### FR-4 Start Game
The app must allow a user to start a new game with minimal required fields.

### FR-5 Live Entry
The app must allow a user to record stat events during live play with one or two touches.

### FR-6 Undo
The app must allow a user to undo the most recent stat event.

### FR-7 Points Played
The app must compute Points Played automatically from point participation.

### FR-8 Offline Storage
The app must continue to accept stat entry while offline.

### FR-9 Sync
The app must synchronize locally stored changes to the backend when connectivity returns.

### FR-10 Box Score Views
The app must show a box score table with lineup-group tabs.

## Data Requirements
### Team
- Team name
- Division

### Player
- Team reference
- Player name
- Jersey number
- Position
- Age
- Matching-player designation (MMP or WMP)

### LineupGroup
- Team reference
- Group name
- Player membership list

### Game
- Team reference
- Optional opponent
- Optional date
- Optional location
- Optional tournament reference
- Game type
- Optional score fields

### Point
- Game reference
- Point number
- Outcome

### PlayerPoint
- Point reference
- Player reference

### StatEvent
- Point reference
- Player reference
- Stat type
- Created timestamp

## UI Requirements
- The main live screen must prioritize quick stat entry over general navigation
- The main live screen must focus on the 7 current players on the field
- Stat controls must be large enough for touch use
- Tabs must be available for lineup-group views
- The interface must make offline state visible to the user
- The interface must make undo visible and easy to access

## Non-Functional Requirements
- Must work on mobile, tablet, and desktop browsers
- Must support offline use as a first-class behavior
- Must be responsive and usable outdoors on a small screen
- Must keep live stat entry fast enough for game use
- Must use PostgreSQL for persistent storage
- Must be maintainable for a first-time web developer

## Acceptance Criteria
The MVP is acceptable when all of the following are true:
- A user can sign in with team SSO
- A user can create a roster
- A user can create lineup groups
- A user can start a game without completing all details up front
- A user can enter stats live for the 7 players on the field
- A user can undo the last stat entry
- The app continues working offline
- The app syncs recorded changes when connection returns
- The box score updates correctly from stored stat events

## Future Enhancements
- Trend charts across games and tournaments
- Multi-team support
- More detailed lineup and playing-time analytics
- Expanded tournament management
- Practice drill tracking
- Advanced sync conflict handling
