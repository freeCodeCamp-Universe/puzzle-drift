import type { SaveState } from '../types/game';

export function unlockNextLevel(save: SaveState): SaveState {
  const nextLevel = save.currentLevel + 1;

  return {
    ...save,
    currentLevel: nextLevel,
    unlockedLevel: Math.max(save.unlockedLevel, nextLevel),
    hasActiveRun: true,
  };
}
