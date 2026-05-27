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
      musicEnabled: false,
      reducedMotion: true,
      soundEnabled: false,
      theme: 'ember-grid',
    });

    expect(loadSettings()).toEqual({
      highContrast: true,
      musicEnabled: false,
      reducedMotion: true,
      soundEnabled: false,
      theme: 'ember-grid',
    });
  });

  it('does not overwrite best moves with a worse move count', () => {
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 10,
      stars: 3,
      timeSeconds: 20,
    });
    const result = completeLevel(progress, 1, {
      moves: 14,
      stars: 2,
      timeSeconds: 18,
    });

    expect(result.bestMoves[1]).toBe(10);
  });

  it('overwrites best moves with a better move count', () => {
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 10,
      stars: 2,
      timeSeconds: 20,
    });
    const result = completeLevel(progress, 1, {
      moves: 8,
      stars: 3,
      timeSeconds: 18,
    });

    expect(result.bestMoves[1]).toBe(8);
  });

  it('does not overwrite best time with a worse time', () => {
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 10,
      stars: 3,
      timeSeconds: 20,
    });
    const result = completeLevel(progress, 1, {
      moves: 8,
      stars: 2,
      timeSeconds: 30,
    });

    expect(result.bestTimeSeconds[1]).toBe(20);
  });

  it('overwrites best time with a better time', () => {
    const progress = completeLevel(createInitialSaveData(), 1, {
      moves: 10,
      stars: 2,
      timeSeconds: 20,
    });
    const result = completeLevel(progress, 1, {
      moves: 12,
      stars: 2,
      timeSeconds: 16,
    });

    expect(result.bestTimeSeconds[1]).toBe(16);
  });

  it('unlocks the next level after completion', () => {
    const result = completeLevel(createInitialSaveData(), 1, {
      moves: 10,
      stars: 2,
      timeSeconds: 20,
    });

    expect(result.completedLevels).toContain(1);
    expect(result.unlockedLevels).toContain(2);
  });
});
