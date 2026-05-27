import type { SaveState } from '../types/game';

export const INITIAL_SAVE: SaveState = {
  bestMoves: {},
  bestTimeSeconds: {},
  completedLevels: [],
  currentLevel: 1,
  hasActiveRun: false,
  levelStats: [],
  stars: {},
  unlockedLevels: [1],
};
