import type { SaveState } from '../types/game';

export function unlockNextLevel(save: SaveState): SaveState {
  const nextLevel = save.currentLevel + 1;

  return {
    ...save,
    currentLevel: nextLevel,
    unlockedLevels: [...new Set([...save.unlockedLevels, nextLevel])].sort((a, b) => a - b),
    hasActiveRun: true,
  };
}
