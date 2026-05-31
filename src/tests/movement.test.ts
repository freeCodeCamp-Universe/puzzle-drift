import { describe, expect, it } from 'vitest';
import type { Level } from '../types/game';
import { canCompleteLevel } from '../logic/levelCompletion';
import { calculateStars, createInitialGameState, getEffectiveTileAt, movePlayer } from '../logic/movement';

const movementLevel: Level = {
  description: 'Movement test level.',
  grid: [
    ['floor', 'floor', 'floor'],
    ['floor', 'floor', 'floor'],
    ['floor', 'floor', 'exit'],
  ],
  height: 3,
  hints: [{ text: 'Test hint.' }],
  id: 999,
  mechanics: ['floor', 'exit'],
  name: 'Movement Lab',
  playerStart: { x: 1, y: 1 },
  targetMoves: 4,
  targetTimeSeconds: 20,
  width: 3,
};

const wallLevel: Level = {
  ...movementLevel,
  grid: [
    ['floor', 'wall', 'floor'],
    ['floor', 'floor', 'floor'],
    ['floor', 'floor', 'exit'],
  ],
};

const keyDoorLevel: Level = {
  ...movementLevel,
  grid: [
    ['floor', 'key', 'door'],
    ['floor', 'floor', 'exit'],
    ['floor', 'floor', 'floor'],
  ],
  playerStart: { x: 0, y: 0 },
};

const keyCompletionLevel: Level = {
  ...movementLevel,
  completionRequirements: {
    requiresKeyCollection: true,
    requiresDoorOpened: true,
    requiredKeysCollected: 1,
    requiredDoorsOpened: 1,
  },
  grid: [
    ['floor', 'key', 'door'],
    ['floor', 'floor', 'exit'],
    ['floor', 'floor', 'floor'],
  ],
  playerStart: { x: 0, y: 0 },
};

const pushBlockLevel: Level = {
  ...movementLevel,
  grid: [
    ['floor', 'pushBlock', 'floor', 'wall'],
    ['floor', 'floor', 'floor', 'floor'],
    ['floor', 'floor', 'floor', 'floor'],
  ],
  height: 3,
  playerStart: { x: 0, y: 0 },
  width: 4,
};

const twoBlockLevel: Level = {
  ...pushBlockLevel,
  grid: [
    ['floor', 'pushBlock', 'pushBlock', 'floor'],
    ['floor', 'floor', 'floor', 'floor'],
    ['floor', 'floor', 'floor', 'floor'],
  ],
};

const pressurePlateLevel: Level = {
  ...movementLevel,
  grid: [
    ['floor', 'pushBlock', 'pressurePlate', 'door'],
    ['floor', 'pressurePlate', 'floor', 'floor'],
    ['floor', 'floor', 'floor', 'floor'],
  ],
  height: 3,
  links: [{ sourceId: 'plate-b', targetId: 'door-a' }],
  playerStart: { x: 0, y: 0 },
  tileIds: {
    '2,0': 'plate-a',
    '3,0': 'door-a',
    '1,1': 'plate-b',
  },
  width: 4,
};

const switchLevel: Level = {
  ...movementLevel,
  grid: [
    ['floor', 'switch', 'floor'],
    ['floor', 'floor', 'door'],
    ['floor', 'floor', 'floor'],
  ],
  links: [{ sourceId: 'switch-a', targetId: 'door-a' }],
  playerStart: { x: 0, y: 0 },
  tileIds: {
    '1,0': 'switch-a',
    '2,1': 'door-a',
  },
};

const iceLevel: Level = {
  ...movementLevel,
  grid: [['floor', 'ice', 'ice', 'floor', 'wall']],
  height: 1,
  playerStart: { x: 0, y: 0 },
  width: 5,
};

const iceWallLevel: Level = {
  ...movementLevel,
  grid: [['floor', 'ice', 'ice', 'wall']],
  height: 1,
  playerStart: { x: 0, y: 0 },
  width: 4,
};

const iceKeyLevel: Level = {
  ...movementLevel,
  grid: [['floor', 'ice', 'key']],
  height: 1,
  playerStart: { x: 0, y: 0 },
  width: 3,
};

const iceExitLevel: Level = {
  ...movementLevel,
  grid: [['floor', 'ice', 'exit']],
  height: 1,
  playerStart: { x: 0, y: 0 },
  width: 3,
};

const iceSpikeLevel: Level = {
  ...movementLevel,
  grid: [['floor', 'ice', 'spike']],
  height: 1,
  playerStart: { x: 0, y: 0 },
  width: 3,
};

const portalLevel: Level = {
  ...movementLevel,
  grid: [
    ['floor', 'portal', 'floor'],
    ['floor', 'floor', 'floor'],
    ['portal', 'floor', 'floor'],
  ],
  links: [{ sourceId: 'portal-a', targetId: 'portal-b' }],
  playerStart: { x: 0, y: 0 },
  tileIds: {
    '1,0': 'portal-a',
    '0,2': 'portal-b',
  },
};

const icePortalLevel: Level = {
  ...movementLevel,
  grid: [['floor', 'ice', 'portal', 'floor', 'portal']],
  height: 1,
  links: [{ sourceId: 'portal-a', targetId: 'portal-b' }],
  playerStart: { x: 0, y: 0 },
  tileIds: {
    '2,0': 'portal-a',
    '4,0': 'portal-b',
  },
  width: 5,
};

describe('movement logic', () => {
  it('moves the player up, down, left, and right', () => {
    const start = createInitialGameState(movementLevel);

    expect(movePlayer(movementLevel, start, 'up').playerPosition).toEqual({ x: 1, y: 0 });
    expect(movePlayer(movementLevel, start, 'down').playerPosition).toEqual({ x: 1, y: 2 });
    expect(movePlayer(movementLevel, start, 'left').playerPosition).toEqual({ x: 0, y: 1 });
    expect(movePlayer(movementLevel, start, 'right').playerPosition).toEqual({ x: 2, y: 1 });
  });

  it('does not move through walls', () => {
    const start = createInitialGameState(wallLevel);
    const result = movePlayer(wallLevel, start, 'up');

    expect(result.playerPosition).toEqual(start.playerPosition);
  });

  it('does not move out of bounds', () => {
    const start = {
      ...createInitialGameState(movementLevel),
      playerPosition: { x: 0, y: 0 },
    };
    const result = movePlayer(movementLevel, start, 'left');

    expect(result.playerPosition).toEqual({ x: 0, y: 0 });
    expect(result.moves).toBe(0);
  });

  it('does not increment moves for invalid movement', () => {
    const start = createInitialGameState(wallLevel);
    const result = movePlayer(wallLevel, start, 'up');

    expect(result.moves).toBe(0);
  });

  it('increments moves for valid movement', () => {
    const start = createInitialGameState(movementLevel);
    const result = movePlayer(movementLevel, start, 'right');

    expect(result.moves).toBe(1);
  });

  it('completes the level when the player reaches an exit', () => {
    const start = createInitialGameState(movementLevel);
    const movedRight = movePlayer(movementLevel, start, 'right');
    const result = movePlayer(movementLevel, movedRight, 'down');

    expect(result.playerPosition).toEqual({ x: 2, y: 2 });
    expect(result.isComplete).toBe(true);
  });

  it('does not complete a required key level by reaching the exit without key progress', () => {
    const state = {
      ...createInitialGameState(keyCompletionLevel),
      playerPosition: { x: 2, y: 1 },
    };

    expect(canCompleteLevel(keyCompletionLevel, state)).toBe(false);
  });

  it('does not complete a required key level after collecting a key without opening a door', () => {
    const state = {
      ...createInitialGameState(keyCompletionLevel),
      collectedKeyPositions: [{ x: 1, y: 0 }],
      collectedKeys: 1,
      keysCollectedThisAttempt: 1,
      playerPosition: { x: 2, y: 1 },
    };

    expect(canCompleteLevel(keyCompletionLevel, state)).toBe(false);
  });

  it('completes a required key level after collecting a key and opening a door', () => {
    const state = {
      ...createInitialGameState(keyCompletionLevel),
      collectedKeyPositions: [{ x: 1, y: 0 }],
      doorsOpenedThisAttempt: 1,
      keysCollectedThisAttempt: 1,
      openedDoorPositions: [{ x: 2, y: 0 }],
      playerPosition: { x: 2, y: 1 },
    };

    expect(canCompleteLevel(keyCompletionLevel, state)).toBe(true);
  });

  it('collecting a key increases key count and removes the key tile', () => {
    const start = createInitialGameState(keyDoorLevel);
    const result = movePlayer(keyDoorLevel, start, 'right');

    expect(result.collectedKeys).toBe(1);
    expect(result.keysCollectedThisAttempt).toBe(1);
    expect(getEffectiveTileAt(keyDoorLevel, result, { x: 1, y: 0 })).toBe('floor');
  });

  it('doors block movement without a key', () => {
    const start = {
      ...createInitialGameState(keyDoorLevel),
      playerPosition: { x: 1, y: 0 },
    };
    const result = movePlayer(keyDoorLevel, start, 'right');

    expect(result.playerPosition).toEqual({ x: 1, y: 0 });
    expect(result.moves).toBe(0);
  });

  it('opens a door with a key and consumes the key', () => {
    const start = createInitialGameState(keyDoorLevel);
    const withKey = movePlayer(keyDoorLevel, start, 'right');
    const result = movePlayer(keyDoorLevel, withKey, 'right');

    expect(result.playerPosition).toEqual({ x: 2, y: 0 });
    expect(result.collectedKeys).toBe(0);
    expect(result.keysCollectedThisAttempt).toBe(1);
    expect(result.doorsOpenedThisAttempt).toBe(1);
    expect(getEffectiveTileAt(keyDoorLevel, result, { x: 2, y: 0 })).toBe('floor');
  });

  it('linked open doors do not consume keys', () => {
    const start = {
      ...createInitialGameState(switchLevel),
      activeSwitchIds: ['switch-a'],
      collectedKeys: 1,
      playerPosition: { x: 1, y: 1 },
    };
    const result = movePlayer(switchLevel, start, 'right');

    expect(result.playerPosition).toEqual({ x: 2, y: 1 });
    expect(result.collectedKeys).toBe(1);
  });

  it('undo can restore door and key state from the history snapshot', () => {
    const start = createInitialGameState(keyDoorLevel);
    const withKey = movePlayer(keyDoorLevel, start, 'right');
    const openedDoor = movePlayer(keyDoorLevel, withKey, 'right');
    const undoSnapshot = withKey;

    expect(openedDoor.openedDoorPositions).toEqual([{ x: 2, y: 0 }]);
    expect(undoSnapshot.collectedKeys).toBe(1);
    expect(undoSnapshot.openedDoorPositions).toEqual([]);
    expect(getEffectiveTileAt(keyDoorLevel, undoSnapshot, { x: 2, y: 0 })).toBe('door');
  });

  it('reset restores the original key and door layout', () => {
    const start = createInitialGameState(keyDoorLevel);
    const withKey = movePlayer(keyDoorLevel, start, 'right');
    const openedDoor = movePlayer(keyDoorLevel, withKey, 'right');
    const resetState = createInitialGameState(keyDoorLevel);

    expect(getEffectiveTileAt(keyDoorLevel, openedDoor, { x: 1, y: 0 })).toBe('floor');
    expect(getEffectiveTileAt(keyDoorLevel, openedDoor, { x: 2, y: 0 })).toBe('floor');
    expect(getEffectiveTileAt(keyDoorLevel, resetState, { x: 1, y: 0 })).toBe('key');
    expect(getEffectiveTileAt(keyDoorLevel, resetState, { x: 2, y: 0 })).toBe('door');
  });

  it('pushes one block into empty floor', () => {
    const start = createInitialGameState(pushBlockLevel);
    const result = movePlayer(pushBlockLevel, start, 'right');

    expect(result.playerPosition).toEqual({ x: 1, y: 0 });
    expect(result.pushBlocks).toEqual([{ x: 2, y: 0 }]);
    expect(getEffectiveTileAt(pushBlockLevel, result, { x: 2, y: 0 })).toBe('pushBlock');
  });

  it('does not push a block into a wall', () => {
    const start = {
      ...createInitialGameState(pushBlockLevel),
      playerPosition: { x: 1, y: 0 },
      pushBlocks: [{ x: 2, y: 0 }],
    };
    const result = movePlayer(pushBlockLevel, start, 'right');

    expect(result.playerPosition).toEqual({ x: 1, y: 0 });
    expect(result.pushBlocks).toEqual([{ x: 2, y: 0 }]);
  });

  it('does not push a block out of bounds', () => {
    const start = {
      ...createInitialGameState(pushBlockLevel),
      playerPosition: { x: 2, y: 2 },
      pushBlocks: [{ x: 3, y: 2 }],
    };
    const result = movePlayer(pushBlockLevel, start, 'right');

    expect(result.playerPosition).toEqual({ x: 2, y: 2 });
    expect(result.pushBlocks).toEqual([{ x: 3, y: 2 }]);
  });

  it('does not push two blocks at once', () => {
    const start = createInitialGameState(twoBlockLevel);
    const result = movePlayer(twoBlockLevel, start, 'right');

    expect(result.playerPosition).toEqual({ x: 0, y: 0 });
    expect(result.pushBlocks).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it('activates a pressure plate when a block is on it', () => {
    const start = createInitialGameState(pressurePlateLevel);
    const result = movePlayer(pressurePlateLevel, start, 'right');

    expect(result.pushBlocks).toEqual([{ x: 2, y: 0 }]);
    expect(result.activePressurePlateIds).toContain('plate-a');
  });

  it('activates a pressure plate when the player is on it', () => {
    const start = createInitialGameState(pressurePlateLevel);
    const result = movePlayer(pressurePlateLevel, start, 'down');

    expect(result.playerPosition).toEqual({ x: 0, y: 1 });
    expect(movePlayer(pressurePlateLevel, result, 'right').activePressurePlateIds).toContain('plate-b');
  });

  it('opens and closes a linked door based on pressure plate activity', () => {
    const start = createInitialGameState(pressurePlateLevel);
    const movedDown = movePlayer(pressurePlateLevel, start, 'down');
    const active = movePlayer(pressurePlateLevel, movedDown, 'right');
    const inactive = movePlayer(pressurePlateLevel, active, 'right');

    expect(getEffectiveTileAt(pressurePlateLevel, active, { x: 3, y: 0 })).toBe('floor');
    expect(getEffectiveTileAt(pressurePlateLevel, inactive, { x: 3, y: 0 })).toBe('door');
  });

  it('undo restores block and pressure plate state from the history snapshot', () => {
    const start = createInitialGameState(pressurePlateLevel);
    const active = movePlayer(pressurePlateLevel, start, 'right');
    const undoSnapshot = start;

    expect(active.activePressurePlateIds).toContain('plate-a');
    expect(undoSnapshot.pushBlocks).toEqual([{ x: 1, y: 0 }]);
    expect(undoSnapshot.activePressurePlateIds).toEqual([]);
  });

  it('stepping on a switch toggles it', () => {
    const start = createInitialGameState(switchLevel);
    const active = movePlayer(switchLevel, start, 'right');

    expect(active.activeSwitchIds).toContain('switch-a');
  });

  it('an active switch opens a linked door', () => {
    const start = createInitialGameState(switchLevel);
    const active = movePlayer(switchLevel, start, 'right');

    expect(getEffectiveTileAt(switchLevel, active, { x: 2, y: 1 })).toBe('floor');
  });

  it('stepping on a switch again toggles it off', () => {
    const start = createInitialGameState(switchLevel);
    const active = movePlayer(switchLevel, start, 'right');
    const movedOffSwitch = movePlayer(switchLevel, active, 'left');
    const inactive = movePlayer(switchLevel, movedOffSwitch, 'right');

    expect(inactive.activeSwitchIds).not.toContain('switch-a');
  });

  it('a linked door closes when a switch turns off', () => {
    const start = createInitialGameState(switchLevel);
    const active = movePlayer(switchLevel, start, 'right');
    const movedOffSwitch = movePlayer(switchLevel, active, 'left');
    const inactive = movePlayer(switchLevel, movedOffSwitch, 'right');

    expect(getEffectiveTileAt(switchLevel, active, { x: 2, y: 1 })).toBe('floor');
    expect(getEffectiveTileAt(switchLevel, inactive, { x: 2, y: 1 })).toBe('door');
  });

  it('undo restores previous switch state', () => {
    const start = createInitialGameState(switchLevel);
    const active = movePlayer(switchLevel, start, 'right');
    const undoSnapshot = start;

    expect(active.activeSwitchIds).toEqual(['switch-a']);
    expect(undoSnapshot.activeSwitchIds).toEqual([]);
  });

  it('reset restores original switch state', () => {
    const start = createInitialGameState(switchLevel);
    const active = movePlayer(switchLevel, start, 'right');
    const resetState = createInitialGameState(switchLevel);

    expect(active.activeSwitchIds).toEqual(['switch-a']);
    expect(resetState.activeSwitchIds).toEqual([]);
    expect(getEffectiveTileAt(switchLevel, resetState, { x: 2, y: 1 })).toBe('door');
  });

  it('entering ice causes the player to continue sliding', () => {
    const start = createInitialGameState(iceLevel);
    const result = movePlayer(iceLevel, start, 'right');

    expect(result.playerPosition).toEqual({ x: 3, y: 0 });
  });

  it('sliding stops before a wall', () => {
    const start = createInitialGameState(iceWallLevel);
    const result = movePlayer(iceWallLevel, start, 'right');

    expect(result.playerPosition).toEqual({ x: 2, y: 0 });
  });

  it('sliding across multiple ice tiles counts as one move', () => {
    const start = createInitialGameState(iceLevel);
    const result = movePlayer(iceLevel, start, 'right');

    expect(result.moves).toBe(1);
  });

  it('sliding can collect a key when landing on a key', () => {
    const start = createInitialGameState(iceKeyLevel);
    const result = movePlayer(iceKeyLevel, start, 'right');

    expect(result.playerPosition).toEqual({ x: 2, y: 0 });
    expect(result.collectedKeys).toBe(1);
    expect(getEffectiveTileAt(iceKeyLevel, result, { x: 2, y: 0 })).toBe('floor');
  });

  it('sliding into an exit completes the level', () => {
    const start = createInitialGameState(iceExitLevel);
    const result = movePlayer(iceExitLevel, start, 'right');

    expect(result.playerPosition).toEqual({ x: 2, y: 0 });
    expect(result.isComplete).toBe(true);
  });

  it('sliding into a spike fails the attempt so the screen can reset', () => {
    const start = createInitialGameState(iceSpikeLevel);
    const result = movePlayer(iceSpikeLevel, start, 'right');

    expect(result.playerPosition).toEqual({ x: 2, y: 0 });
    expect(result.isFailed).toBe(true);
    expect(result.isComplete).toBe(false);
  });

  it('undo can restore the pre-slide position from the history snapshot', () => {
    const start = createInitialGameState(iceLevel);
    const result = movePlayer(iceLevel, start, 'right');
    const undoSnapshot = start;

    expect(result.playerPosition).toEqual({ x: 3, y: 0 });
    expect(undoSnapshot.playerPosition).toEqual({ x: 0, y: 0 });
  });

  it('entering a portal moves the player to the paired portal', () => {
    const start = createInitialGameState(portalLevel);
    const result = movePlayer(portalLevel, start, 'right');

    expect(result.playerPosition).toEqual({ x: 0, y: 2 });
  });

  it('portal movement increments move count once', () => {
    const start = createInitialGameState(portalLevel);
    const result = movePlayer(portalLevel, start, 'right');

    expect(result.moves).toBe(1);
  });

  it('portals do not create infinite teleport loops', () => {
    const start = createInitialGameState(portalLevel);
    const fromFirstPortal = movePlayer(portalLevel, start, 'right');
    const fromSecondPortal = movePlayer(portalLevel, {
      ...start,
      playerPosition: { x: 1, y: 2 },
    }, 'left');

    expect(fromFirstPortal.playerPosition).toEqual({ x: 0, y: 2 });
    expect(fromSecondPortal.playerPosition).toEqual({ x: 1, y: 0 });
    expect(fromFirstPortal.moves).toBe(1);
    expect(fromSecondPortal.moves).toBe(1);
  });

  it('ice sliding into a portal works', () => {
    const start = createInitialGameState(icePortalLevel);
    const result = movePlayer(icePortalLevel, start, 'right');

    expect(result.playerPosition).toEqual({ x: 4, y: 0 });
    expect(result.moves).toBe(1);
  });

  it('undo can restore the pre-portal position from the history snapshot', () => {
    const start = createInitialGameState(portalLevel);
    const result = movePlayer(portalLevel, start, 'right');
    const undoSnapshot = start;

    expect(result.playerPosition).toEqual({ x: 0, y: 2 });
    expect(undoSnapshot.playerPosition).toEqual({ x: 0, y: 0 });
  });

  it('completion gives at least one star', () => {
    const state = {
      ...createInitialGameState(movementLevel),
      elapsedSeconds: 99,
      isComplete: true,
      moves: movementLevel.targetMoves + 1,
    };

    expect(calculateStars(movementLevel, state)).toBe(1);
  });

  it('completed and failed states ignore further movement', () => {
    const completeState = {
      ...createInitialGameState(movementLevel),
      isComplete: true,
    };
    const failedState = {
      ...createInitialGameState(movementLevel),
      isFailed: true,
    };

    expect(movePlayer(movementLevel, completeState, 'right')).toBe(completeState);
    expect(movePlayer(movementLevel, failedState, 'right')).toBe(failedState);
  });

  it('completion under target moves gives two stars', () => {
    const state = {
      ...createInitialGameState(movementLevel),
      elapsedSeconds: movementLevel.targetTimeSeconds + 1,
      isComplete: true,
      moves: movementLevel.targetMoves,
    };

    expect(calculateStars(movementLevel, state)).toBe(2);
  });

  it('completion under target moves and time gives three stars', () => {
    const state = {
      ...createInitialGameState(movementLevel),
      elapsedSeconds: movementLevel.targetTimeSeconds,
      isComplete: true,
      moves: movementLevel.targetMoves,
    };

    expect(calculateStars(movementLevel, state)).toBe(3);
  });
});
