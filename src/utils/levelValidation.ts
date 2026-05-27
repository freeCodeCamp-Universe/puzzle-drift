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

export function validateLevel(level: Level): LevelValidationIssue[] {
  const issues: LevelValidationIssue[] = [];

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
