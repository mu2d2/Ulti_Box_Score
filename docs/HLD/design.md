# Ultimate Frisbee Box Score

## Overview
Ultimate Frisbee is a new sport with a growing audience and player base. Like most sports there are statistics that track events that occur throughout a game and shows a players impact on the field. However, tracking these stats are difficult given there isnt a standard box score framework like other sports and requires manual tallies. The purpose of this web app is to provide that framework along with other tools that Coaches/Captains can use to track players performance and playing time.

### High Level Requirements
- This must be a web app that has a GUI which supports different platforms: mobile, desktop, tablet, etc
- Stat entry is done **live during gameplay** using +1 / -1 buttons (increment or decrement by one) for each counting stat
- Stats are tracked per player and include: **Goals, Assists, Turnovers, Blocks, Points Played**
- Allow for data to be saved on a per practice, point, game, or tournament basis
- Create graphical trends across games, over rounds, etc for different statistics
- Allow coaches ability to have a tool to create different lineups and track playing time between players over a game
- Leave room in the design for further expansion of the web app for different team support, etc.
- The app must function **offline-first**: all stat entry works without an internet connection, with data synced to the server when connectivity is restored (Progressive Web App / PWA)

### Authentication
- Authentication is scoped to a **single team login** — one account per team, shared by the coaching staff
- Single Sign-On (SSO) will be used for authentication (e.g., Google OAuth), eliminating the need to manage passwords
- Multi-user / multi-team support is out of scope for v1 but the architecture should not preclude it

### Ultimate Frisbee the Game
Ultimate frisbee (officially simply called ultimate) is a non-contact team sport played with a disc flung by hand. Points are scored by passing the disc to a teammate in the opposing end zone. Other basic rules are that players must not take steps while holding the disc, while interceptions, incomplete passes, and passes out of bounds are turnovers (change in possession). Rain, wind, or occasionally other adversities can make for a testing match with rapid turnovers, heightening the pressure of play.

### Tools/Technology
The stack below was chosen to minimize complexity for a first-time web developer while remaining production-capable:

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | **React** (Vite) | Component-based UI, large ecosystem, beginner-friendly with strong tooling |
| Offline/PWA | **Vite PWA plugin** + IndexedDB (via Dexie.js) | Enables offline stat entry and background sync when connectivity returns |
| Backend | **Django** + Django REST Framework | Python-based, batteries-included, easier to learn than Node for backend logic |
| Database | **PostgreSQL** | Relational model fits structured game/player/stat data; free and widely hosted |
| Auth | **Django Allauth** (Google OAuth / SSO) | Handles SSO with minimal custom code |
| Version Control | **Git** | — |
| Target Browsers | Safari, Chrome, Brave | — |

> **Note for v1:** React handles the UI and offline logic; Django serves a REST API and persists data to PostgreSQL. The two communicate over HTTP/JSON. This separation keeps concerns clean and allows the frontend and backend to evolve independently.

---

## Data Model

### Design Principles
- Each stat occurrence is stored as an individual **StatEvent** row, enabling undo (delete the last event), point-level breakdowns, and long-term trend analysis
- **Points Played** is always derived by counting `PlayerPoint` rows — it is never stored separately
- **Game details** (opponent, date, tournament) are optional at creation time — a user can start entering stats immediately and fill in details later
- **Box score tabs** are filtered views of the same underlying data, driven by user-defined `LineupGroup` assignments

### Entity Descriptions

#### Team
Represents the team using the app. v1 supports a single team per deployment.
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| name | string | |
| division | string | e.g. Mixed, Open, Women |

#### Player
A member of the team roster.
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| team | FK → Team | |
| name | string | |
| jersey\_number | integer | |
| position | string | e.g. Handler, Cutter |
| age | integer | optional |
| match\_player\_type | enum | MMP or WMP |

#### LineupGroup
A named, user-defined subset of players (e.g. "O-Line", "D-Line", "Zone D"). Used to filter the box score into tabs.
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| team | FK → Team | |
| name | string | customizable |

#### LineupGroupMember
Join table linking players to lineup groups (many-to-many).
| Field | Type | Notes |
|---|---|---|
| lineup\_group | FK → LineupGroup | |
| player | FK → Player | |

#### Tournament
An optional grouping of games played at one event.
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| team | FK → Team | |
| name | string | optional |
| date | date | optional |
| location | string | optional |

#### Game
A single game session. All descriptive fields are optional so stat entry can begin immediately.
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| team | FK → Team | |
| tournament | FK → Tournament | nullable |
| opponent | string | optional |
| date | date | optional |
| location | string | optional |
| game\_type | enum | tournament / scrimmage / practice |
| our\_score | integer | optional, updated as points are logged |
| their\_score | integer | optional |

#### Point
A single scoring sequence within a game.
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| game | FK → Game | |
| point\_number | integer | sequential within the game |
| outcome | enum | scored / gave\_up |

#### PlayerPoint
Records which players were on the field for a given point. Counting these rows per player gives **Points Played**.
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| point | FK → Point | |
| player | FK → Player | |

#### StatEvent
One row per individual stat occurrence. Supports undo (delete row), live entry correction, and granular trend analysis.
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| point | FK → Point | |
| player | FK → Player | |
| stat\_type | enum | Goal / Assist / Turnover / Block |
| created\_at | timestamp | used to order and undo events |

### Derived Stats
These are computed at query time, never stored:
| Stat | Derivation |
|---|---|
| Points Played | COUNT of `PlayerPoint` rows for that player in a given scope |
| Box score totals | SUM of `StatEvent` rows grouped by player and stat\_type |
| Trend data | Same aggregation scoped to a date range, tournament, or game |

### Entity Relationship Summary
```
Team ──< Player ──< PlayerPoint >── Point >── Game >── Tournament
               \                        |
                \──< LineupGroupMember >── LineupGroup
                          Point ──< StatEvent >── Player
```