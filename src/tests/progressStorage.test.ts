import { beforeEach, describe, expect, it } from 'vitest';
import {
  completeLevel,
  createInitialSaveData,
  loadProgress,
  loadSettings,
  saveProgress,
  saveSettings,
} from '../utils/progressStorage';
import { resetAppStorage } from './testStorage';

describe('progress storage', () => {
  beforeEach(() => {
    resetAppStorage();
  });

  it('saves and loads progress', () => {
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 14,
      stars: 2,
      timeSeconds: 44,
    });

    saveProgress(progress);

    expect(loadProgress()).toMatchObject({
      bestMoves: { 1: 14 },
      bestTimeSeconds: { 1: 44 },
      completedLevels: [1],
      stars: { 1: 2 },
      unlockedLevels: [1, 2],
    });
  });

  it('saves and loads settings', () => {
    saveSettings({
      highContrast: true,
      reducedMotion: true,
      soundEnabled: false,
    });

    expect(loadSettings()).toEqual({
      highContrast: true,
      reducedMotion: true,
      soundEnabled: false,
    });
  });
});
