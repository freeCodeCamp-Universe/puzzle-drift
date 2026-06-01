import { describe, expect, it } from 'vitest';
import { LEVELS } from '../data/levels';
import {
  countMeaningfulDecisions,
  getMinimumMeaningfulDecisions,
  validateLevel,
  validateLevels,
  VALID_TILE_TYPES,
} from '../utils/levelValidation';
import type { Level } from '../types/game';

describe('level validation', () => {
  it('defines 30 levels', () => {
    expect(LEVELS).toHaveLength(30);
  });

  it('passes validation for every level', () => {
    expect(validateLevels(LEVELS)).toEqual([]);
  });

  it('defines three standard hint tiers and a late-game fourth tier', () => {
    LEVELS.forEach((level) => {
      expect(level.hints).toHaveLength(level.id >= 26 ? 4 : 3);
      expect(level.hints.every((hint) => hint.text.trim().length > 0)).toBe(true);
    });

    expect(LEVELS.filter((level) => level.hints.length === 4).map((level) => level.id)).toEqual([
      26,
      27,
      28,
      29,
      30,
    ]);
  });

  it('uses reusable mechanic hints in composed campaign hints', () => {
    expect(LEVELS[10].hints.map((hint) => hint.text)).toEqual([
      'The shortest route is not the safest.',
      'Spikes block the most direct-looking corridor.',
      'Approach the exit from the lower route.',
    ]);

    expect(LEVELS[2].hints.map((hint) => hint.text)).toEqual([
      'The locked door blocks the only route forward. Locked doors require keys.',
      'Look for the item before returning to the gate. The key may require backtracking.',
      'Collect the item, then come back to the lock. The door is mandatory.',
    ]);
    expect(LEVELS[5].hints.map((hint) => hint.text)).toEqual([
      'The closed door blocks the only path forward. Switches can change the map.',
      'Step on the marked object before returning. Watch what opens.',
      'After the door opens, return to the marked passage. The switch controls the required route.',
    ]);
    expect(LEVELS[15].hints[0].text).toContain('Not every route can be walked.');
  });

  it('uses decomposition hints for late-game multi-mechanic levels', () => {
    expect(LEVELS.slice(25, 30).every((level) => level.hints.length === 4)).toBe(true);
    expect(LEVELS.slice(25, 30).flatMap((level) => level.hints.map((hint) => hint.text))).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('Not every route can be walked.'),
        expect.stringContaining('Switches can change the map.'),
        expect.stringContaining('Locked doors require keys.'),
      ]),
    );

    expect(LEVELS[25].hints.map((hint) => hint.text)).toEqual([
      'Start by solving the key route through the hazards.',
      'Cross the cold lane for the key before treating the door as an objective.',
      'The safe route depends on where the ice leaves you after the key.',
      'The final door should be approached only after the key route has a return path.',
    ]);
    expect(LEVELS[29].hints.map((hint) => hint.text)).toEqual([
      'Start by opening the cargo route.',
      'The ice section becomes useful later.',
      'The portal is not the first objective.',
      'The final key should be collected after the switch route is opened.',
    ]);
  });

  it('enforces tiered meaningful decision minimums for levels 11-30', () => {
    LEVELS.filter((level) => level.id >= 11 && level.id <= 30).forEach((level) => {
      expect(countMeaningfulDecisions(level)).toBeGreaterThanOrEqual(
        getMinimumMeaningfulDecisions(level.id),
      );
    });
  });

  it('rejects late campaign levels below their meaningful decision minimum', () => {
    const invalidLevel: Level = {
      ...LEVELS[25],
      completionRequirements: {
        requiresIceTraversal: true,
        requiredIceTilesTraversed: 1,
      },
    };

    expect(validateLevel(invalidLevel)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Level requires at least 4 meaningful decisions, received 1.',
        }),
      ]),
    );
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

  it('rejects key completion requirements without key tiles', () => {
    const invalidLevel: Level = {
      ...LEVELS[0],
      completionRequirements: {
        requiresKeyCollection: true,
      },
    };

    expect(validateLevel(invalidLevel)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Level requires key collection but defines no key tiles.',
        }),
      ]),
    );
  });

  it('rejects door completion requirements without door tiles', () => {
    const invalidLevel: Level = {
      ...LEVELS[0],
      completionRequirements: {
        requiresDoorOpened: true,
      },
    };

    expect(validateLevel(invalidLevel)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Level requires a door to be opened but defines no door tiles.',
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
