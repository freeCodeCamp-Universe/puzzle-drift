import type { Level, TileType } from '../types/game';

export const VALID_TILE_TYPES = [
  'floor',
  'wall',
  'exit',
  'key',
  'door',
  'switch',
  'pressurePlate',
  'pushBlock',
  'portal',
  'spike',
  'ice',
  'cracked',
  'fog',
  'oneWay',
  'mirror',
  'laserEmitter',
  'laserReceiver',
] as const satisfies TileType[];

const VALID_TILE_TYPE_SET = new Set<TileType>(VALID_TILE_TYPES);

export type LevelValidationIssue = {
  levelId: number;
  message: string;
};

export function getMinimumMeaningfulDecisions(levelId: number) {
  if (levelId >= 26 && levelId <= 30) {
    return 4;
  }

  if (levelId >= 21 && levelId <= 25) {
    return 3;
  }

  if (levelId >= 16 && levelId <= 20) {
    return 2;
  }

  if (levelId >= 11 && levelId <= 15) {
    return 1;
  }

  return 0;
}

export function countMeaningfulDecisions(level: Level) {
  const requirements = level.completionRequirements;

  if (!requirements) {
    return 0;
  }

  return [
    requirements.requiresKeyCollection || (requirements.requiredKeysCollected ?? 0) > 0,
    requirements.requiresDoorOpened || (requirements.requiredDoorsOpened ?? 0) > 0,
    requirements.requiresSwitchActivation || (requirements.requiredSwitchesActivated ?? 0) > 0,
    requirements.requiresLinkedDoorOpened || (requirements.requiredLinkedDoorsOpened ?? 0) > 0,
    requirements.requiresBlockPush || (requirements.requiredBlocksPushed ?? 0) > 0,
    requirements.requiresPressurePlateActivation ||
      (requirements.requiredPressurePlatesActivated ?? 0) > 0,
    requirements.requiresPortalUsage ||
      requirements.requiresPortalUse ||
      (requirements.requiredPortalsUsed ?? 0) > 0,
    requirements.requiresIceTraversal ||
      requirements.requiresIceSlide ||
      (requirements.requiredIceTilesTraversed ?? requirements.requiredIceSlides ?? 0) > 0,
    requirements.requiresSpikeAvoidance,
  ].filter(Boolean).length;
}

export function validateLevel(level: Level): LevelValidationIssue[] {
  const issues: LevelValidationIssue[] = [];
  const tileCounts = new Map<TileType, number>();

  if (level.grid.length !== level.height) {
    issues.push({
      levelId: level.id,
      message: `Expected ${level.height} rows, received ${level.grid.length}.`,
    });
  }

  level.grid.forEach((row, rowIndex) => {
    if (row.length !== level.width) {
      issues.push({
        levelId: level.id,
        message: `Expected row ${rowIndex} to contain ${level.width} tiles, received ${row.length}.`,
      });
    }

    row.forEach((tile, columnIndex) => {
      tileCounts.set(tile, (tileCounts.get(tile) ?? 0) + 1);

      if (!VALID_TILE_TYPE_SET.has(tile)) {
        issues.push({
          levelId: level.id,
          message: `Invalid tile "${tile}" at (${columnIndex}, ${rowIndex}).`,
        });
      }
    });
  });

  if (
    !Number.isInteger(level.playerStart.x) ||
    !Number.isInteger(level.playerStart.y) ||
    level.playerStart.x < 0 ||
    level.playerStart.y < 0 ||
    level.playerStart.x >= level.width ||
    level.playerStart.y >= level.height
  ) {
    issues.push({
      levelId: level.id,
      message: 'Level must have exactly one in-bounds player start.',
    });
  }

  if (!level.grid.some((row) => row.includes('exit'))) {
    issues.push({
      levelId: level.id,
      message: 'Level must have at least one exit tile.',
    });
  }

  const minimumMeaningfulDecisions = getMinimumMeaningfulDecisions(level.id);
  const meaningfulDecisions = countMeaningfulDecisions(level);

  if (meaningfulDecisions < minimumMeaningfulDecisions) {
    issues.push({
      levelId: level.id,
      message: `Level requires at least ${minimumMeaningfulDecisions} meaningful decisions, received ${meaningfulDecisions}.`,
    });
  }

  if (level.completionRequirements?.requiresDoorOpened && !tileCounts.get('door')) {
    issues.push({
      levelId: level.id,
      message: 'Level requires a door to be opened but defines no door tiles.',
    });
  }

  if (level.completionRequirements?.requiresKeyCollection && !tileCounts.get('key')) {
    issues.push({
      levelId: level.id,
      message: 'Level requires key collection but defines no key tiles.',
    });
  }

  if (level.completionRequirements?.requiresSwitchActivation && !tileCounts.get('switch')) {
    issues.push({
      levelId: level.id,
      message: 'Level requires switch activation but defines no switch tiles.',
    });
  }

  if (level.completionRequirements?.requiresBlockPush && !tileCounts.get('pushBlock')) {
    issues.push({
      levelId: level.id,
      message: 'Level requires a block push but defines no push block tiles.',
    });
  }

  if (level.completionRequirements?.requiresPressurePlateActivation && !tileCounts.get('pressurePlate')) {
    issues.push({
      levelId: level.id,
      message: 'Level requires pressure plate activation but defines no pressure plate tiles.',
    });
  }

  if (
    (level.completionRequirements?.requiresPortalUsage || level.completionRequirements?.requiresPortalUse) &&
    !tileCounts.get('portal')
  ) {
    issues.push({
      levelId: level.id,
      message: 'Level requires portal use but defines no portal tiles.',
    });
  }

  if (
    (level.completionRequirements?.requiresIceTraversal || level.completionRequirements?.requiresIceSlide) &&
    !tileCounts.get('ice')
  ) {
    issues.push({
      levelId: level.id,
      message: 'Level requires ice sliding but defines no ice tiles.',
    });
  }

  if (level.completionRequirements?.requiresSpikeAvoidance && !tileCounts.get('spike')) {
    issues.push({
      levelId: level.id,
      message: 'Level requires spike avoidance but defines no spike tiles.',
    });
  }

  if (
    level.completionRequirements?.requiresLinkedDoorOpened &&
    !level.links?.some((link) => {
      const targetPosition = Object.entries(level.tileIds ?? {}).find(([, id]) => id === link.targetId)?.[0];

      if (!targetPosition) {
        return false;
      }

      const [x, y] = targetPosition.split(',').map(Number);

      return level.grid[y]?.[x] === 'door';
    })
  ) {
    issues.push({
      levelId: level.id,
      message: 'Level requires a linked door to open but defines no linked door tiles.',
    });
  }

  if (!Array.isArray(level.hints) || level.hints.length < 1 || level.hints.length > 3) {
    issues.push({
      levelId: level.id,
      message: 'Level must define between 1 and 3 hints.',
    });
  }

  level.hints?.forEach((hint, hintIndex) => {
    if (!hint.text.trim()) {
      issues.push({
        levelId: level.id,
        message: `Hint ${hintIndex + 1} must include text.`,
      });
    }
  });

  return issues;
}

export function validateLevels(levels: Level[]): LevelValidationIssue[] {
  return levels.flatMap(validateLevel);
}
