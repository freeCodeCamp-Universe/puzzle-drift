import { beforeEach, describe, expect, it } from 'vitest';
import {
  completeLevel,
  createInitialSaveData,
  loadProgress,
  loadSettings,
  saveProgress,
  saveSettings,
  unlockHintTier,
} from '../utils/progressStorage';
import { resetAppStorage } from './testStorage';
import {
  createHintAnalyticsReport,
  loadHintAnalytics,
  recordHintAnalyticsAttempt,
  recordHintAnalyticsCompletion,
  recordHintAnalyticsOpen,
  recordHintAnalyticsTierUse,
  saveHintAnalytics,
} from '../utils/hintAnalytics';
import { LEVELS } from '../data/levels';

describe('progress storage', () => {
  beforeEach(() => {
    resetAppStorage();
  });

  it('saves and loads progress', () => {
    const progress = completeLevel(createInitialSaveData(), 1, {
      doorsOpened: 2,
      firstTryClear: true,
      hintsUsed: 1,
      keysCollected: 1,
      moves: 14,
      portalsUsed: 3,
      stars: 2,
      timeSeconds: 44,
    });

    saveProgress(progress);

    expect(loadProgress()).toMatchObject({
      bestMoves: { 1: 14 },
      bestTimeSeconds: { 1: 44 },
      completedLevels: [1],
      levelStats: [
        expect.objectContaining({
          completionDate: expect.any(String),
          doorsOpened: 2,
          firstTryClear: true,
          hintsUsed: 1,
          keysCollected: 1,
          portalsUsed: 3,
        }),
      ],
      stars: { 1: 2 },
      unlockedLevels: [1, 2],
    });
  });

  it('saves and loads unlocked hint tiers', () => {
    const progress = unlockHintTier(unlockHintTier(createInitialSaveData(), 1, 2), 1, 1);

    saveProgress(progress);

    expect(loadProgress().unlockedHints).toEqual({
      1: [1, 2],
    });
  });

  it('saves local hint analytics and creates a debug report', () => {
    let analytics = loadHintAnalytics();

    analytics = recordHintAnalyticsAttempt(analytics, 1);
    analytics = recordHintAnalyticsOpen(analytics, 1, 2, true);
    analytics = recordHintAnalyticsTierUse(analytics, 1, 2);
    analytics = recordHintAnalyticsCompletion(analytics, 1, true);
    saveHintAnalytics(analytics);

    const loadedAnalytics = loadHintAnalytics();

    expect(loadedAnalytics.levels[1]).toMatchObject({
      attempts: 1,
      attemptsWithHint: 1,
      completionsAfterHint: 1,
      failuresBeforeHintSamples: 1,
      failuresBeforeHintTotal: 2,
      hintOpens: 1,
      tierUses: { 2: 1 },
    });
    expect(createHintAnalyticsReport(loadedAnalytics, LEVELS)[0]).toMatchObject({
      completionRate: 1,
      hintUsageRate: 1,
      levelId: 1,
      levelName: LEVELS[0].name,
    });
  });

  it('saves and loads settings', () => {
    saveSettings({
      confirmRestart: false,
      focusMode: true,
      highContrast: true,
      hintNudgesEnabled: false,
      reducedMotion: true,
    });

    expect(loadSettings()).toEqual({
      confirmRestart: false,
      focusMode: true,
      highContrast: true,
      hintNudgesEnabled: false,
      reducedMotion: true,
    });
  });

  it('drops legacy theme and audio settings when loading settings', () => {
    window.localStorage.setItem(
      'puzzle-drift:settings',
      JSON.stringify({
        highContrast: true,
        musicEnabled: false,
        reducedMotion: true,
        soundEnabled: false,
        theme: 'ember-grid',
      }),
    );

    expect(loadSettings()).toEqual({
      confirmRestart: true,
      focusMode: false,
      highContrast: true,
      hintNudgesEnabled: true,
      reducedMotion: true,
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
