import { describe, expect, it } from 'vitest';
import { CAMPAIGN_MECHANIC_CALLBACKS, LEVELS } from '../data/levels';
import {
  countMeaningfulDecisions,
  getMinimumMeaningfulDecisions,
  validateLevel,
  validateLevels,
  VALID_TILE_TYPES,
} from '../utils/levelValidation';
import type { CampaignMechanic, Level, TileType } from '../types/game';

const MECHANIC_TILE_REQUIREMENTS: Record<CampaignMechanic, TileType[]> = {
  keys: ['key', 'door'],
  switches: ['switch'],
  pushBlocks: ['pushBlock'],
  pressurePlates: ['pressurePlate'],
  portals: ['portal'],
  ice: ['ice'],
  spikes: ['spike'],
};

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
      'The lock is close, but the key is on the route behind you. Locked doors require keys.',
      'Collect the item before committing to the lower lane. The key may require backtracking.',
      'Return to the gate after the key changes what the corridor means. The door is mandatory.',
    ]);
    expect(LEVELS[5].hints.map((hint) => hint.text)).toEqual([
      'The switch sits off the direct route for a reason. Switches can change the map.',
      'Step on the switch, then return to the upper passage. Watch what opens.',
      'Treat the switch as a remote key for the required route. The switch controls the required route.',
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
      'Read the final row from the exit backward.',
      'The cargo route must hold one gate open before the top route matters.',
      'The ice lane and portal are the return path after the cargo stage is set.',
      'On the final row, solve switch gate, plate gate, key, then final lock.',
    ]);
  });

  it('defines memorable signature concepts across the campaign', () => {
    const signatureLevels = LEVELS.filter((level) => level.signature);

    expect(signatureLevels.length).toBeGreaterThanOrEqual(10);
    expect(signatureLevels.map((level) => level.id)).toEqual(
      expect.arrayContaining([5, 10, 12, 17, 20, 22, 24, 27, 28, 30]),
    );
    expect(signatureLevels.map((level) => level.signature)).toEqual(
      expect.arrayContaining([
        'The exit is accessible immediately but cannot be used yet.',
        'The block is not the obstacle; it is the access route.',
        'The safest route is longer than the obvious crossing.',
        'The portal is the return route, not the first objective.',
        'The portal stitches two halves of the same puzzle together.',
        'The ice lane is useful only after the key route is solved.',
        'The switch is right, but the obvious return route is wrong.',
        'The key is a trap until the cargo route is open.',
        'The portal is the exit approach after the key.',
        'The final row shows the whole plan before you can execute it.',
      ]),
    );
  });

  it('gives every Training Grid level a distinct signature concept', () => {
    const trainingLevels = LEVELS.slice(0, 10);
    const trainingSignatures = trainingLevels.map((level) => level.signature);

    expect(trainingSignatures.every((signature) => signature && signature.trim().length > 0)).toBe(
      true,
    );
    expect(new Set(trainingSignatures).size).toBe(trainingLevels.length);
    expect(trainingSignatures).toEqual([
      'The first turn matters.',
      'The exit is seen through the center but reached from outside.',
      'The key is behind the path you already passed.',
      'The side loop is the main route.',
      'The exit is accessible immediately but cannot be used yet.',
      'The switch is a detour, not the destination.',
      'One push changes the whole level.',
      'The player can press the plate, but only the block can leave.',
      'Open the first gate to reach the final key.',
      'The block is not the obstacle; it is the access route.',
    ]);
  });

  it('calibrates late-game star mastery targets without multi-minute buffers', () => {
    const tunedTargets = new Map(
      LEVELS.slice(14, 30).map((level) => [
        level.id,
        { moves: level.targetMoves, timeSeconds: level.targetTimeSeconds },
      ]),
    );

    expect(Object.fromEntries(tunedTargets)).toEqual({
      15: { moves: 10, timeSeconds: 28 },
      16: { moves: 18, timeSeconds: 42 },
      17: { moves: 24, timeSeconds: 52 },
      18: { moves: 26, timeSeconds: 58 },
      19: { moves: 29, timeSeconds: 62 },
      20: { moves: 17, timeSeconds: 45 },
      21: { moves: 18, timeSeconds: 48 },
      22: { moves: 24, timeSeconds: 60 },
      23: { moves: 18, timeSeconds: 50 },
      24: { moves: 28, timeSeconds: 68 },
      25: { moves: 31, timeSeconds: 72 },
      26: { moves: 17, timeSeconds: 50 },
      27: { moves: 30, timeSeconds: 78 },
      28: { moves: 18, timeSeconds: 54 },
      29: { moves: 21, timeSeconds: 58 },
      30: { moves: 25, timeSeconds: 88 },
    });
    expect(LEVELS.slice(25, 30).every((level) => level.targetTimeSeconds <= 90)).toBe(true);
  });

  it('maps every major mechanic through introduction, reinforcement, subversion, and mastery callbacks', () => {
    const expectedMechanics: CampaignMechanic[] = [
      'keys',
      'switches',
      'pushBlocks',
      'pressurePlates',
      'portals',
      'ice',
      'spikes',
    ];

    expect(CAMPAIGN_MECHANIC_CALLBACKS.map((callback) => callback.mechanic)).toEqual(
      expectedMechanics,
    );

    CAMPAIGN_MECHANIC_CALLBACKS.forEach((callback) => {
      const stages = [
        callback.introduction,
        callback.reinforcement,
        callback.subversion,
        callback.mastery,
      ];
      const levelIds = stages.map((stage) => stage.levelId);
      const requiredTiles = MECHANIC_TILE_REQUIREMENTS[callback.mechanic];

      expect(levelIds).toEqual([...levelIds].sort((firstId, secondId) => firstId - secondId));
      expect(new Set(levelIds).size).toBe(levelIds.length);
      expect(callback.mastery.levelId).toBe(30);

      stages.forEach((stage) => {
        const level = LEVELS.find((candidate) => candidate.id === stage.levelId);

        expect(level, `${callback.mechanic} callback level ${stage.levelId} exists`).toBeDefined();
        expect(stage.note.trim().length).toBeGreaterThan(0);
        expect(
          requiredTiles.some((tile) => level?.mechanics.includes(tile)),
          `${callback.mechanic} callback level ${stage.levelId} includes relevant mechanics`,
        ).toBe(true);
      });
    });
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
