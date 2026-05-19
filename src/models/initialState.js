export const initialState = {
  games: [
    {
      id: "game-1",
      name: "Game 1",
      opponent: "",
      isCompleted: false,
      createdAt: "",
    },
  ],
  activeGameId: "game-1",
  gameDataById: {
    "game-1": {
      pointNumber: 1,
      currentOnFieldPlayerIds: [],
      playerPointsPlayed: {},
      statEvents: [],
    },
  },
  players: [],
  lineupGroups: [],
  lineupMembership: {},
};
