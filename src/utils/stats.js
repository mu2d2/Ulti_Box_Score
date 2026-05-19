import { STAT_TYPES } from "../models/types";

export function buildBoxScore(players, statEvents, playerPointsPlayed, playerFilterIds = null) {
  const allowed = playerFilterIds ? new Set(playerFilterIds) : null;

  return players
    .filter((player) => (allowed ? allowed.has(player.id) : true))
    .map((player) => {
      const row = {
        playerId: player.id,
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        position: player.position,
        matchPlayerType: player.matchPlayerType,
        pointsPlayed: playerPointsPlayed[player.id] || 0,
      };

      for (const statType of STAT_TYPES) {
        row[statType] = 0;
      }

      for (const evt of statEvents) {
        if (evt.playerId === player.id && row[evt.statType] !== undefined) {
          row[evt.statType] += 1;
        }
      }

      return row;
    });
}
