import { DEFAULT_SETTINGS } from '../data/defaultSettings';
import { INITIAL_SAVE } from '../data/initialSave';
import { LEVELS } from '../data/levels';
import type { ControlStyle, GameSettings, SaveData } from '../types/game';
import { readStorageValue, removeStorageValue, writeStorageValue } from './storage';

const PROGRESS_STORAGE_KEY = 'puzzle-drift:save';
const SETTINGS_STORAGE_KEY = 'puzzle-drift:settings';

type CompletionResult = {
  doorsOpened?: number;
  firstTryClear?: boolean;
  hintsUsed?: number;
  keysCollected?: number;
  moves: number;
  portalsUsed?: number;
  timeSeconds: number;
  stars: number;
};

function uniqueSortedLevels(levels: number[]) {
  return [...new Set(levels)].sort((a, b) => a - b);
}

function uniqueSortedHintTiers(tiers: number[]) {
  return [...new Set(tiers)].filter((tier) => Number.isInteger(tier) && tier > 0).sort((a, b) => a - b);
}

function normalizeUnlockedHints(unlockedHints: SaveData['unlockedHints'] = {}) {
  return Object.fromEntries(
    Object.entries(unlockedHints).map(([levelId, tiers]) => [levelId, uniqueSortedHintTiers(tiers)]),
  );
}

function normalizeControlStyle(controlStyle: unknown): ControlStyle {
  return controlStyle === 'buttons' || controlStyle === 'swipe' || controlStyle === 'both'
    ? controlStyle
    : DEFAULT_SETTINGS.controlStyle;
}

export function createInitialSaveData(): SaveData {
  return {
    ...INITIAL_SAVE,
    bestMoves: { ...INITIAL_SAVE.bestMoves },
    bestTimeSeconds: { ...INITIAL_SAVE.bestTimeSeconds },
    completedLevels: [...INITIAL_SAVE.completedLevels],
    levelStats: [...INITIAL_SAVE.levelStats],
    stars: { ...INITIAL_SAVE.stars },
    unlockedHints: normalizeUnlockedHints(INITIAL_SAVE.unlockedHints),
    unlockedLevels: [...INITIAL_SAVE.unlockedLevels],
  };
}

export function loadProgress(): SaveData {
  const storedProgress = readStorageValue<SaveData>(PROGRESS_STORAGE_KEY, createInitialSaveData());
  const bestMoves = storedProgress.bestMoves ?? {};
  const bestTimeSeconds = storedProgress.bestTimeSeconds ?? {};
  const completedLevels = storedProgress.completedLevels ?? [];
  const levelStats = storedProgress.levelStats ?? [];
  const stars = storedProgress.stars ?? {};
  const unlockedHints = storedProgress.unlockedHints ?? {};
  const unlockedLevels = storedProgress.unlockedLevels ?? [1];

  return {
    ...createInitialSaveData(),
    ...storedProgress,
    bestMoves: { ...bestMoves },
    bestTimeSeconds: { ...bestTimeSeconds },
    completedLevels: uniqueSortedLevels(completedLevels),
    levelStats: [...levelStats],
    stars: { ...stars },
    unlockedHints: normalizeUnlockedHints(unlockedHints),
    unlockedLevels: uniqueSortedLevels(unlockedLevels.length ? unlockedLevels : [1]),
  };
}

export function saveProgress(progress: SaveData) {
  writeStorageValue(PROGRESS_STORAGE_KEY, progress);
}

export function loadSettings(): GameSettings {
  const storedSettings = readStorageValue<Partial<GameSettings>>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);

  return {
    confirmRestart: storedSettings.confirmRestart ?? DEFAULT_SETTINGS.confirmRestart,
    controlStyle: normalizeControlStyle(storedSettings.controlStyle),
    focusMode: storedSettings.focusMode ?? DEFAULT_SETTINGS.focusMode,
    highContrast: storedSettings.highContrast ?? DEFAULT_SETTINGS.highContrast,
    hintNudgesEnabled: storedSettings.hintNudgesEnabled ?? DEFAULT_SETTINGS.hintNudgesEnabled,
    reducedMotion: storedSettings.reducedMotion ?? DEFAULT_SETTINGS.reducedMotion,
  };
}

export function saveSettings(settings: GameSettings) {
  writeStorageValue(SETTINGS_STORAGE_KEY, {
    confirmRestart: settings.confirmRestart,
    controlStyle: normalizeControlStyle(settings.controlStyle),
    focusMode: settings.focusMode,
    highContrast: settings.highContrast,
    hintNudgesEnabled: settings.hintNudgesEnabled,
    reducedMotion: settings.reducedMotion,
  });
}

export function clearProgressStorage() {
  removeStorageValue(PROGRESS_STORAGE_KEY);
}

export function isLevelUnlocked(progress: SaveData, levelId: number) {
  return progress.unlockedLevels.includes(levelId);
}

export function isLevelCompleted(progress: SaveData, levelId: number) {
  return progress.completedLevels.includes(levelId);
}

export function getLevelBestMoves(progress: SaveData, levelId: number) {
  return progress.bestMoves[levelId];
}

export function getLevelBestTimeSeconds(progress: SaveData, levelId: number) {
  return progress.bestTimeSeconds[levelId];
}

export function getLevelStars(progress: SaveData, levelId: number) {
  return progress.stars[levelId] ?? 0;
}

export function unlockHintTier(progress: SaveData, levelId: number, tierNumber: number): SaveData {
  const currentTiers = progress.unlockedHints[levelId] ?? [];
  const unlockedTiers = uniqueSortedHintTiers([...currentTiers, tierNumber]);

  if (unlockedTiers.length === currentTiers.length) {
    return progress;
  }

  return {
    ...progress,
    unlockedHints: {
      ...progress.unlockedHints,
      [levelId]: unlockedTiers,
    },
  };
}

export function completeLevel(
  progress: SaveData,
  levelId: number,
  result: CompletionResult,
): SaveData {
  const nextLevel = levelId + 1;
  const canUnlockNext = nextLevel <= LEVELS.length;
  const completedLevels = uniqueSortedLevels([...progress.completedLevels, levelId]);
  const unlockedLevels = uniqueSortedLevels([
    ...progress.unlockedLevels,
    ...(canUnlockNext ? [nextLevel] : []),
  ]);
  const previousBestMoves = progress.bestMoves[levelId];
  const previousBestTime = progress.bestTimeSeconds[levelId];
  const previousStars = progress.stars[levelId] ?? 0;
  const previousStats = progress.levelStats.find((stats) => stats.levelId === levelId);
  const bestMoves =
    previousBestMoves === undefined ? result.moves : Math.min(previousBestMoves, result.moves);
  const bestTimeSeconds =
    previousBestTime === undefined ? result.timeSeconds : Math.min(previousBestTime, result.timeSeconds);
  const stars = Math.max(previousStars, result.stars);
  const firstTryClear = previousStats?.firstTryClear || result.firstTryClear;
  const otherStats = progress.levelStats.filter((stats) => stats.levelId !== levelId);

  return {
    ...progress,
    bestMoves: {
      ...progress.bestMoves,
      [levelId]: bestMoves,
    },
    bestTimeSeconds: {
      ...progress.bestTimeSeconds,
      [levelId]: bestTimeSeconds,
    },
    completedLevels,
    currentLevel: levelId,
    hasActiveRun: true,
    levelStats: [
      ...otherStats,
      {
        bestMoves,
        bestTimeSeconds,
        completed: true,
        completionDate: new Date().toISOString(),
        doorsOpened: result.doorsOpened,
        firstTryClear,
        hintsUsed: result.hintsUsed ?? 0,
        keysCollected: result.keysCollected,
        levelId,
        portalsUsed: result.portalsUsed,
        stars,
      },
    ].sort((a, b) => a.levelId - b.levelId),
    stars: {
      ...progress.stars,
      [levelId]: stars,
    },
    unlockedLevels,
  };
}
