# User Interface Ideas

## Overall UI Direction
The app should be optimized for live, in-game stat entry on a phone or tablet. The primary interaction should be fast touch input with minimal navigation, since the user may be tracking a point while the game is moving quickly.

The main live screen should focus on the **7 players currently on the field** and make it easy to update **any stat for any of those players** with a single tap.

### Box Score
The expected counting stats to start will be: Goals, Assists, Turnovers, Blocks, Points Played.
These categories should be columns against rows which will be each player's name & jersey number.
See below figure for an example from a Basketball Boxscore:
![alt text](basketball_boxscore.png)

Along with this there should be a simple **large touch button** to increase a player's stat. The button should be easy to hit quickly from the box score table view, without requiring the user to open a separate modal.

For live play, the box score should show the **7 players currently on the field** and allow the user to tap the stat button for the correct player and stat combination in one or two touches.

Similar to this pop up but easy for an user to access from the box score table pov
![alt text](GUI_buttons.png)

There should be different tabbed views on the box score to view different lineups that the user sets from Roster Entry. These tabs should act as quick filters for customized views of the same live stat table.

Points Played should update automatically based on which players are marked as being on the field for a point.

The interface should also support quick undo for the most recent stat event so mistakes can be corrected during live entry.

### Roster Entry
Separate page should be available for the user to enter Player Name, Jersey number, position, and age to a roster list which then is visually populated as the user types in entries.

Additionally, the user should have the option for creating groupings of different lineups of different players with customizable names. These groupings are what drive the tabbed views in the box score.

The roster entry form should also include a simple way to mark each player as MMP (male matching player) or WMP (woman matching player).

### Game Setup and Entry
The user should be able to start a game quickly with only a minimal amount of required information. Opponent, date, location, and tournament details can be filled in later.

The live scoring flow should allow stat entry first and game metadata later, so the app can be used immediately when a game begins.

### Offline Behavior
Since the app starts offline-first, the UI should clearly show when data is stored locally and when it has synced to the server.

If the device loses connectivity, the user should still be able to keep entering stats without interruption.