# User Interface Ideas

## Overall UI Direction
The app should be optimized for live, in-game stat entry on a phone or tablet. The primary interaction should be fast touch input with minimal navigation, since the user may be tracking a point while the game is moving quickly.

The main live screen should focus on the **7 players currently on the field** and make it easy to update **any stat for any of those players** with a single tap.

The app should have separate areas for **Roster** and **Games** so roster setup is reusable across multiple games.

The app should have four primary pages:
- **Games** page
- **Roster Entry and List** page
- **Live Entry** page
- **Box Score** page

The roster page defines players and lineup groups once, and those should be reused when creating and tracking different games.

### Live Entry
The live entry screen should be separate from the box score screen.

Live entry should allow the user to filter available player options by selecting one or more lineup group tabs. Example: if the user selects "Alpha" and "Beta", players from both groups should appear for on-field selection and stat entry.

The expected counting stats to start will be: Goals, Assists, Turnovers, Blocks.

Along with this there should be a simple **large touch button** to increase a player's stat. The button should be easy to hit quickly from the live entry view, without requiring the user to open a separate modal.

For live play, the live entry page should show the players from the selected lineup filter and allow the user to tap the stat button for the correct player and stat combination in one or two touches.

The interface should support quick undo for the most recent stat event so mistakes can be corrected during live entry.

Each stat button press should provide immediate visual feedback so the user can confirm the tap was registered.

Live entry should include both increment and decrement controls for each stat so users can quickly correct mistakes while tracking points.

Decrement should only affect events from the current point to avoid changing historical points by mistake.

The app should provide a clear, visible **Clear History** action with confirmation to reset current game history (stat events, points played, and current on-field selections) while keeping roster and lineup group setup.

### Box Score
The expected counting stats to start will be: Goals, Assists, Turnovers, Blocks, Points Played.
These categories should be columns against rows which will be each player's name & jersey number.
See below figure for an example from a Basketball Boxscore:
![alt text](basketball_boxscore.png)

Similar to this pop up but easy for an user to access from the box score table pov
![alt text](GUI_buttons.png)

There should be different tabbed views on the box score to view different lineups that the user sets from Roster Entry. These tabs should act as quick filters for customized views of the same live stat table.

Box score tabs should support selecting one or more lineup groups at the same time so users can view combined stats across multiple lines.

Points Played should update automatically based on which players are marked as being on the field for a point.

The box score page is view-focused and should not be the primary live stat entry screen.

### Roster Entry
Separate page should be available for the user to enter Player Name, Jersey number, position, and age to a roster list which then is visually populated as the user types in entries.

Additionally, the user should have the option for creating groupings of different lineups by selecting players and assigning a custom lineup group name (for example: Alpha, Beta, O-Line 1). These groupings are what drive the tabbed views in the box score.

The roster entry form should also include a simple way to mark each player as MMP (male matching player) or WMP (woman matching player).

The roster list on this page should support inline editing so the user can quickly update player information (name, position, role, jersey number, age, and MMP/WMP) without leaving the list.

The roster page should provide a clear **Clear Roster** action with confirmation to remove all players and lineup assignments.

The roster page should also include a lineup builder section:
- Enter lineup group name
- Select players to include
- Save the group so it appears as a new tab on the Box Score page
- Edit existing lineup groups (rename and update selected players)

### Game Setup and Entry
The user should be able to create multiple games from a dedicated Games page, select an active game, and then use Live Entry and Box Score for that selected game.

The Games page should support editing game details, deleting a game with confirmation, and toggling game status between In Progress and Completed.

The user should be able to start a game quickly with only a minimal amount of required information. Opponent, date, location, and tournament details can be filled in later.

The live scoring flow should allow stat entry first and game metadata later, so the app can be used immediately when a game begins.

### Offline Behavior
Since the app starts offline-first, the UI should clearly show when data is stored locally and when it has synced to the server.

If the device loses connectivity, the user should still be able to keep entering stats without interruption.