import type { Level } from '../types/game';
import { readStorageValue, writeStorageValue } from './storage';

const HINT_ANALYTICS_STORAGE_KEY = 'puzzle-drift:hint-analytics';

export type LevelHintAnalytics = {
  attempts: number;
  attemptsWithHint: number;
  completions: number;
  completionsAfterHint: number;
  failuresBeforeHintSamples: number;
  failuresBeforeHintTotal: number;
  hintOpens: number;
  tierUses: Record<number, number>;
};

export type HintAnalyticsData = {
  levels: Record<number, LevelHintAnalytics>;
};

export type HintAnalyticsReportRow = {
  completionRate: number;
  hintUsageRate: number;
  levelId: number;
  levelName: string;
};

const EMPTY_ANALYTICS: HintAnalyticsData = {
  levels: {},
};

function createEmptyLevelAnalytics(): LevelHintAnalytics {
  return {
    attempts: 0,
    attemptsWithHint: 0,
    completions: 0,
    completionsAfterHint: 0,
    failuresBeforeHintSamples: 0,
    failuresBeforeHintTotal: 0,
    hintOpens: 0,
    tierUses: {},
  };
}

function normalizeLevelAnalytics(levelAnalytics?: Partial<LevelHintAnalytics>): LevelHintAnalytics {
  return {
    ...createEmptyLevelAnalytics(),
    ...levelAnalytics,
    tierUses: { ...(levelAnalytics?.tierUses ?? {}) },
  };
}

function updateLevelAnalytics(
  analytics: HintAnalyticsData,
  levelId: number,
  update: (levelAnalytics: LevelHintAnalytics) => LevelHintAnalytics,
) {
  return {
    levels: {
      ...analytics.levels,
      [levelId]: update(normalizeLevelAnalytics(analytics.levels[levelId])),
    },
  };
}

export function loadHintAnalytics(): HintAnalyticsData {
  const storedAnalytics = readStorageValue<HintAnalyticsData>(
    HINT_ANALYTICS_STORAGE_KEY,
    EMPTY_ANALYTICS,
  );

  return {
    levels: Object.fromEntries(
      Object.entries(storedAnalytics.levels ?? {}).map(([levelId, levelAnalytics]) => [
        levelId,
        normalizeLevelAnalytics(levelAnalytics),
      ]),
    ),
  };
}

export function saveHintAnalytics(analytics: HintAnalyticsData) {
  writeStorageValue(HINT_ANALYTICS_STORAGE_KEY, analytics);
}

export function recordHintAnalyticsAttempt(analytics: HintAnalyticsData, levelId: number) {
  return updateLevelAnalytics(analytics, levelId, (levelAnalytics) => ({
    ...levelAnalytics,
    attempts: levelAnalytics.attempts + 1,
  }));
}

export function recordHintAnalyticsOpen(
  analytics: HintAnalyticsData,
  levelId: number,
  failuresBeforeHint: number,
  isFirstHintThisAttempt: boolean,
) {
  return updateLevelAnalytics(analytics, levelId, (levelAnalytics) => ({
    ...levelAnalytics,
    attemptsWithHint: levelAnalytics.attemptsWithHint + (isFirstHintThisAttempt ? 1 : 0),
    failuresBeforeHintSamples:
      levelAnalytics.failuresBeforeHintSamples + (isFirstHintThisAttempt ? 1 : 0),
    failuresBeforeHintTotal:
      levelAnalytics.failuresBeforeHintTotal + (isFirstHintThisAttempt ? failuresBeforeHint : 0),
    hintOpens: levelAnalytics.hintOpens + 1,
  }));
}

export function recordHintAnalyticsTierUse(
  analytics: HintAnalyticsData,
  levelId: number,
  tierNumber: number,
) {
  return updateLevelAnalytics(analytics, levelId, (levelAnalytics) => ({
    ...levelAnalytics,
    tierUses: {
      ...levelAnalytics.tierUses,
      [tierNumber]: (levelAnalytics.tierUses[tierNumber] ?? 0) + 1,
    },
  }));
}

export function recordHintAnalyticsCompletion(
  analytics: HintAnalyticsData,
  levelId: number,
  didUseHintThisAttempt: boolean,
) {
  return updateLevelAnalytics(analytics, levelId, (levelAnalytics) => ({
    ...levelAnalytics,
    completions: levelAnalytics.completions + 1,
    completionsAfterHint: levelAnalytics.completionsAfterHint + (didUseHintThisAttempt ? 1 : 0),
  }));
}

export function createHintAnalyticsReport(
  analytics: HintAnalyticsData,
  levels: Level[],
): HintAnalyticsReportRow[] {
  return levels.map((level) => {
    const levelAnalytics = normalizeLevelAnalytics(analytics.levels[level.id]);

    return {
      completionRate:
        levelAnalytics.attemptsWithHint > 0
          ? levelAnalytics.completionsAfterHint / levelAnalytics.attemptsWithHint
          : 0,
      hintUsageRate:
        levelAnalytics.attempts > 0 ? levelAnalytics.attemptsWithHint / levelAnalytics.attempts : 0,
      levelId: level.id,
      levelName: level.name,
    };
  });
}
