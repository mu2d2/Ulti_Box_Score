/**
 * Validates stat events before committing a point.
 *
 * Rules:
 *   - At most 1 Goal recorded across all on-field players for the current point.
 *   - At most 1 Assist recorded across all on-field players for the current point.
 *
 * This module is intentionally isolated from UI and game-state concerns so it
 * can be tested and reasoned about independently.
 *
 * @param {Array<{playerId: string, statType: string, pointNumber: number}>} statEvents
 * @param {number} pointNumber - The point currently being played.
 * @param {string[]} onFieldPlayerIds - The 7 players currently on the field.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePointCommit(statEvents, pointNumber, onFieldPlayerIds) {
  const onFieldSet = new Set(onFieldPlayerIds);
  const errors = [];

  let goalCount = 0;
  let assistCount = 0;

  for (const event of statEvents) {
    if (event.pointNumber !== pointNumber) continue;
    if (!onFieldSet.has(event.playerId)) continue;

    if (event.statType === "Goal") goalCount += 1;
    if (event.statType === "Assist") assistCount += 1;
  }

  if (goalCount > 1) {
    errors.push(`${goalCount} goals recorded this point — only 1 is allowed per point.`);
  }
  if (assistCount > 1) {
    errors.push(`${assistCount} assists recorded this point — only 1 is allowed per point.`);
  }

  return { valid: errors.length === 0, errors };
}
