import { describe, expect, it } from 'vitest';
import { LEVELS } from '../data/levels';
import { validateLevel, validateLevels, VALID_TILE_TYPES } from '../utils/levelValidation';
import type { Level } from '../types/game';

describe('level validation', () => {
  it('defines 30 levels', () => {
    expect(LEVELS).toHaveLength(30);
  });

  it('passes validation for every level', () => {
    expect(validateLevels(LEVELS)).toEqual([]);
  });

  it('rejects levels without an in-bounds player start', () => {
    const invalidLevel: Level = {
      ...LEVELS[0],
      playerStart: { x: -1, y: 0 },
    };

    expect(validateLevel(invalidLevel)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Level must have exactly one in-bounds player start.',
        }),
      ]),
    );
  });

  it('rejects levels without exits', () => {
    const invalidLevel: Level = {
      ...LEVELS[0],
      grid: LEVELS[0].grid.map((row) => row.map((tile) => (tile === 'exit' ? 'floor' : tile))),
    };

    expect(validateLevel(invalidLevel)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Level must have at least one exit tile.',
        }),
      ]),
    );
  });

  it('contains the full supported tile type list', () => {
    expect(VALID_TILE_TYPES).toEqual([
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
    ]);
  });
});
