import type { SaveState } from '../types/game';

export const INITIAL_SAVE: SaveState = {
  currentLevel: 1,
  hasActiveRun: false,
  unlockedLevel: 1,
};
