import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameBoard } from '../components/GameBoard';
import { LEVELS } from '../data/levels';
import { canCompleteLevel } from '../logic/levelCompletion';
import { createInitialGameState, movePlayer } from '../logic/movement';
import type { Direction, GameState, Position } from '../types/game';
import { completeLevel, createInitialSaveData, isLevelUnlocked } from '../utils/progressStorage';
import { validateLevels } from '../utils/levelValidation';

const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];

function sortPositions(positions: Position[]) {
  return [...positions].sort((a, b) => a.y - b.y || a.x - b.x);
}

function serializeState(state: GameState) {
  return JSON.stringify({
    activeSwitchIds: [...state.activeSwitchIds].sort(),
    blocksPushedThisAttempt: state.blocksPushedThisAttempt,
    collectedKeyPositions: sortPositions(state.collectedKeyPositions),
    collectedKeys: state.collectedKeys,
    doorsOpenedThisAttempt: state.doorsOpenedThisAttempt,
    keysCollectedThisAttempt: state.keysCollectedThisAttempt,
    linkedDoorsOpenedThisAttempt: state.linkedDoorsOpenedThisAttempt,
    openedDoorPositions: sortPositions(state.openedDoorPositions),
    playerPosition: state.playerPosition,
    pushBlocks: sortPositions(state.pushBlocks),
    switchesActivatedThisAttempt: state.switchesActivatedThisAttempt,
  });
}

function findSolutionPath(levelId: number) {
  const level = LEVELS.find((candidate) => candidate.id === levelId);

  if (!level) {
    return null;
  }

  const initialState = createInitialGameState(level);
  const queue: Array<{ path: Direction[]; state: GameState }> = [{ path: [], state: initialState }];
  const visited = new Set([serializeState(initialState)]);

  while (queue.length > 0 && visited.size < 25000) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    for (const direction of DIRECTIONS) {
      const nextState = movePlayer(level, current.state, direction);

      if (nextState.isFailed) {
        continue;
      }

      const nextPath = [...current.path, direction];

      if (nextState.isComplete) {
        return nextPath;
      }

      const key = serializeState(nextState);

      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ path: nextPath, state: nextState });
      }
    }
  }

  return null;
}

function findSolutionLength(levelId: number) {
  return findSolutionPath(levelId)?.length ?? null;
}

function positionsAreAdjacent(first: Position, second: Position) {
  return Math.abs(first.x - second.x) + Math.abs(first.y - second.y) === 1;
}

function getSolutionPositions(levelId: number) {
  const level = LEVELS.find((candidate) => candidate.id === levelId);
  const path = findSolutionPath(levelId);

  if (!level || !path) {
    return [];
  }

  let state = createInitialGameState(level);
  const positions = [state.playerPosition];

  path.forEach((direction) => {
    state = movePlayer(level, state, direction);
    positions.push(state.playerPosition);
  });

  return positions;
}

function getCompletedState(levelId: number) {
  const level = LEVELS.find((candidate) => candidate.id === levelId);
  const path = findSolutionPath(levelId);

  if (!level || !path) {
    return null;
  }

  return path.reduce((state, direction) => movePlayer(level, state, direction), createInitialGameState(level));
}

function movePath(levelId: number, path: Direction[]) {
  const level = LEVELS.find((candidate) => candidate.id === levelId);

  if (!level) {
    return null;
  }

  return path.reduce((state, direction) => movePlayer(level, state, direction), createInitialGameState(level));
}

function getSpikePositions(level: (typeof LEVELS)[number]) {
  return level.grid.flatMap((row, y) =>
    row.flatMap((tile, x) => (tile === 'spike' ? [{ x, y }] : [])),
  );
}

function isExitReachableWithDoorsBlocked(levelId: number) {
  const level = LEVELS.find((candidate) => candidate.id === levelId);

  if (!level) {
    return false;
  }

  const queue: Position[] = [level.playerStart];
  const visited = new Set([`${level.playerStart.x},${level.playerStart.y}`]);
  const directions: Position[] = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    if (level.grid[current.y][current.x] === 'exit') {
      return true;
    }

    directions.forEach((direction) => {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const tile = level.grid[next.y]?.[next.x];
      const key = `${next.x},${next.y}`;

      if (!tile || visited.has(key) || tile === 'wall' || tile === 'door') {
        return;
      }

      visited.add(key);
      queue.push(next);
    });
  }

  return false;
}

function isExitReachableWithInitialBlocksBlocked(levelId: number) {
  const level = LEVELS.find((candidate) => candidate.id === levelId);

  if (!level) {
    return false;
  }

  return isExitReachableFrom(level, level.playerStart, getInitialBlockedPositions(level));
}

function isExitReachableFromCurrentState(levelId: number, state: GameState | null) {
  const level = LEVELS.find((candidate) => candidate.id === levelId);

  if (!level || !state) {
    return false;
  }

  return isExitReachableFrom(level, state.playerPosition, new Set(state.pushBlocks.map(positionKey)));
}

function getInitialBlockedPositions(level: (typeof LEVELS)[number]) {
  return new Set(
    level.grid.flatMap((row, y) =>
      row.flatMap((tile, x) => (tile === 'pushBlock' ? [`${x},${y}`] : [])),
    ),
  );
}

function positionKey(position: Position) {
  return `${position.x},${position.y}`;
}

function isExitReachableFrom(
  level: (typeof LEVELS)[number],
  start: Position,
  blockedPositions: Set<string>,
) {
  const queue: Position[] = [start];
  const visited = new Set([positionKey(start)]);
  const directions: Position[] = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    if (level.grid[current.y][current.x] === 'exit') {
      return true;
    }

    directions.forEach((direction) => {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const tile = level.grid[next.y]?.[next.x];
      const key = positionKey(next);

      if (!tile || visited.has(key) || blockedPositions.has(key) || tile === 'wall' || tile === 'door') {
        return;
      }

      visited.add(key);
      queue.push(next);
    });
  }

  return false;
}

describe('level pack', () => {
  it('all 30 levels validate', () => {
    expect(LEVELS).toHaveLength(30);
    expect(validateLevels(LEVELS)).toEqual([]);
  });

  it('unlocks every level sequentially', () => {
    let progress = createInitialSaveData();

    expect(isLevelUnlocked(progress, 1)).toBe(true);

    for (const level of LEVELS.slice(0, -1)) {
      progress = completeLevel(progress, level.id, {
        moves: level.targetMoves,
        stars: 3,
        timeSeconds: level.targetTimeSeconds,
      });

      expect(isLevelUnlocked(progress, level.id + 1)).toBe(true);
    }
  });

  it('every level has a valid path to an exit', () => {
    const solutionLengths = LEVELS.map((level) => ({
      level,
      solutionLength: findSolutionLength(level.id),
    }));

    expect(solutionLengths).toEqual(
      solutionLengths.map(({ level }) => ({
        level,
        solutionLength: expect.any(Number),
      })),
    );

    solutionLengths.forEach(({ level, solutionLength }) => {
      expect(solutionLength).toBeLessThanOrEqual(level.targetMoves);
    });
  });

  it('Spike Lane has a tighter safe-route par after the hazard lesson redesign', () => {
    const spikeLane = LEVELS.find((level) => level.id === 11);

    expect(spikeLane?.targetMoves).toBe(17);
    expect(spikeLane?.targetTimeSeconds).toBe(40);
    expect(findSolutionLength(11)).toBe(17);
  });

  it('Keyline requires collecting a key and opening the locked door', () => {
    const keyline = LEVELS.find((level) => level.id === 3);
    const completedState = getCompletedState(3);

    expect(keyline?.targetMoves).toBe(18);
    expect(keyline?.targetTimeSeconds).toBe(35);
    expect(findSolutionLength(3)).toBe(18);
    expect(completedState?.collectedKeyPositions).toContainEqual({ x: 3, y: 1 });
    expect(completedState?.openedDoorPositions).toContainEqual({ x: 3, y: 3 });
    expect(completedState?.keysCollectedThisAttempt).toBe(1);
    expect(completedState?.doorsOpenedThisAttempt).toBe(1);
    expect(completedState?.collectedKeys).toBe(0);
  });

  it('Keyline exit is unreachable when locked doors are treated as walls', () => {
    expect(isExitReachableWithDoorsBlocked(3)).toBe(false);
    expect(findSolutionLength(3)).toBe(18);
  });

  it('Door Loop requires the side-loop key and locked door', () => {
    const doorLoop = LEVELS.find((level) => level.id === 4);
    const completedState = getCompletedState(4);

    expect(doorLoop?.completionRequirements).toEqual({
      requiresKeyCollection: true,
      requiresDoorOpened: true,
      requiredKeysCollected: 1,
      requiredDoorsOpened: 1,
    });
    expect(doorLoop?.targetMoves).toBe(22);
    expect(doorLoop?.targetTimeSeconds).toBe(45);
    expect(findSolutionLength(4)).toBe(22);
    expect(completedState?.collectedKeyPositions).toContainEqual({ x: 6, y: 1 });
    expect(completedState?.openedDoorPositions).toContainEqual({ x: 4, y: 6 });
    expect(completedState?.keysCollectedThisAttempt).toBe(1);
    expect(completedState?.doorsOpenedThisAttempt).toBe(1);
    expect(completedState?.collectedKeys).toBe(0);
  });

  it('Door Loop cannot complete without collecting the key and opening the door', () => {
    const doorLoop = LEVELS.find((level) => level.id === 4);

    expect(doorLoop).toBeDefined();

    if (!doorLoop) {
      return;
    }

    const exitOnlyState = {
      ...createInitialGameState(doorLoop),
      playerPosition: { x: 7, y: 6 },
    };
    const collectedKeyState = {
      ...exitOnlyState,
      collectedKeys: 1,
      keysCollectedThisAttempt: 1,
    };
    const completedState = {
      ...collectedKeyState,
      collectedKeys: 0,
      doorsOpenedThisAttempt: 1,
      openedDoorPositions: [{ x: 4, y: 6 }],
    };

    expect(canCompleteLevel(doorLoop, exitOnlyState)).toBe(false);
    expect(canCompleteLevel(doorLoop, collectedKeyState)).toBe(false);
    expect(canCompleteLevel(doorLoop, completedState)).toBe(true);
  });

  it('Door Loop exit is unreachable until the locked door is opened', () => {
    expect(isExitReachableWithDoorsBlocked(4)).toBe(false);
    expect(findSolutionLength(4)).toBe(22);
  });

  it('Clean Exit blocks the reported right-side bypass route', () => {
    const bypassAttempt = movePath(5, [
      'right',
      'right',
      'right',
      'right',
      'right',
      'right',
      'right',
      'right',
      'up',
      'up',
      'up',
      'up',
      'up',
      'up',
      'up',
      'up',
    ]);

    expect(bypassAttempt?.isComplete).toBe(false);
    expect(bypassAttempt?.keysCollectedThisAttempt).toBe(0);
    expect(bypassAttempt?.doorsOpenedThisAttempt).toBe(0);
  });

  it('Clean Exit requires the maze key and final locked passage', () => {
    const cleanExit = LEVELS.find((level) => level.id === 5);
    const completedState = getCompletedState(5);

    expect(cleanExit?.completionRequirements).toEqual({
      requiresKeyCollection: true,
      requiresDoorOpened: true,
      requiredKeysCollected: 1,
      requiredDoorsOpened: 1,
    });
    expect(cleanExit?.targetMoves).toBe(18);
    expect(cleanExit?.targetTimeSeconds).toBe(38);
    expect(findSolutionLength(5)).toBe(18);
    expect(completedState?.collectedKeyPositions).toContainEqual({ x: 1, y: 1 });
    expect(completedState?.openedDoorPositions).toContainEqual({ x: 7, y: 2 });
    expect(completedState?.keysCollectedThisAttempt).toBe(1);
    expect(completedState?.doorsOpenedThisAttempt).toBe(1);
    expect(completedState?.collectedKeys).toBe(0);
  });

  it('Clean Exit cannot complete without collecting the key and opening the door', () => {
    const cleanExit = LEVELS.find((level) => level.id === 5);

    expect(cleanExit).toBeDefined();

    if (!cleanExit) {
      return;
    }

    const exitOnlyState = {
      ...createInitialGameState(cleanExit),
      playerPosition: { x: 7, y: 1 },
    };
    const collectedKeyState = {
      ...exitOnlyState,
      collectedKeys: 1,
      keysCollectedThisAttempt: 1,
    };
    const completedState = {
      ...collectedKeyState,
      collectedKeys: 0,
      doorsOpenedThisAttempt: 1,
      openedDoorPositions: [{ x: 7, y: 2 }],
    };

    expect(canCompleteLevel(cleanExit, exitOnlyState)).toBe(false);
    expect(canCompleteLevel(cleanExit, collectedKeyState)).toBe(false);
    expect(canCompleteLevel(cleanExit, completedState)).toBe(true);
  });

  it('Clean Exit exit is unreachable until the locked door is opened', () => {
    expect(isExitReachableWithDoorsBlocked(5)).toBe(false);
    expect(findSolutionLength(5)).toBe(18);
  });

  it('Switch Primer blocks the direct route to the goal', () => {
    const directAttempt = movePath(6, [
      'right',
      'right',
      'right',
      'right',
      'up',
      'up',
      'up',
      'up',
      'right',
      'right',
    ]);

    expect(directAttempt?.isComplete).toBe(false);
    expect(directAttempt?.switchesActivatedThisAttempt).toBe(0);
    expect(directAttempt?.linkedDoorsOpenedThisAttempt).toBe(0);
  });

  it('Switch Primer requires activating the switch and opening the linked door', () => {
    const switchPrimer = LEVELS.find((level) => level.id === 6);
    const completedState = getCompletedState(6);

    expect(switchPrimer?.completionRequirements).toEqual({
      requiresSwitchActivation: true,
      requiresLinkedDoorOpened: true,
      requiredSwitchesActivated: 1,
      requiredLinkedDoorsOpened: 1,
    });
    expect(switchPrimer?.tileIds?.['3,3']).toBe('switch-a');
    expect(switchPrimer?.tileIds?.['6,1']).toBe('door-a');
    expect(switchPrimer?.links).toContainEqual({ sourceId: 'switch-a', targetId: 'door-a' });
    expect(switchPrimer?.targetMoves).toBe(14);
    expect(switchPrimer?.targetTimeSeconds).toBe(35);
    expect(findSolutionLength(6)).toBe(14);
    expect(completedState?.switchesActivatedThisAttempt).toBe(1);
    expect(completedState?.linkedDoorsOpenedThisAttempt).toBe(1);
    expect(completedState?.activeSwitchIds).toContain('switch-a');
  });

  it('Switch Primer cannot complete without switch progress', () => {
    const switchPrimer = LEVELS.find((level) => level.id === 6);

    expect(switchPrimer).toBeDefined();

    if (!switchPrimer) {
      return;
    }

    const exitOnlyState = {
      ...createInitialGameState(switchPrimer),
      playerPosition: { x: 7, y: 1 },
    };
    const switchOnlyState = {
      ...exitOnlyState,
      switchesActivatedThisAttempt: 1,
    };
    const completedState = {
      ...switchOnlyState,
      activeSwitchIds: ['switch-a'],
      linkedDoorsOpenedThisAttempt: 1,
    };

    expect(canCompleteLevel(switchPrimer, exitOnlyState)).toBe(false);
    expect(canCompleteLevel(switchPrimer, switchOnlyState)).toBe(false);
    expect(canCompleteLevel(switchPrimer, completedState)).toBe(true);
  });

  it('Switch Primer exit is unreachable until the linked door opens', () => {
    expect(isExitReachableWithDoorsBlocked(6)).toBe(false);
    expect(findSolutionLength(6)).toBe(14);
  });

  it('Block Nudge blocks the direct route to the goal until the block moves', () => {
    const directAttempt = movePath(7, [
      'right',
      'right',
      'right',
      'right',
      'right',
      'right',
      'up',
      'up',
      'up',
      'up',
    ]);
    const pushedState = movePath(7, ['up', 'up', 'right', 'right']);

    expect(directAttempt?.isComplete).toBe(false);
    expect(directAttempt?.blocksPushedThisAttempt).toBe(0);
    expect(isExitReachableWithInitialBlocksBlocked(7)).toBe(false);
    expect(isExitReachableFromCurrentState(7, pushedState)).toBe(true);
  });

  it('Block Nudge requires one successful block push', () => {
    const blockNudge = LEVELS.find((level) => level.id === 7);
    const completedState = getCompletedState(7);

    expect(blockNudge?.completionRequirements).toEqual({
      requiresBlockPush: true,
      requiredBlocksPushed: 1,
    });
    expect(blockNudge?.targetMoves).toBe(9);
    expect(blockNudge?.targetTimeSeconds).toBe(28);
    expect(findSolutionLength(7)).toBe(9);
    expect(completedState?.blocksPushedThisAttempt).toBe(1);
    expect(completedState?.pushBlocks).toContainEqual({ x: 4, y: 3 });
  });

  it('Block Nudge cannot complete without block progress', () => {
    const blockNudge = LEVELS.find((level) => level.id === 7);

    expect(blockNudge).toBeDefined();

    if (!blockNudge) {
      return;
    }

    const exitOnlyState = {
      ...createInitialGameState(blockNudge),
      playerPosition: { x: 6, y: 1 },
    };
    const completedState = {
      ...exitOnlyState,
      blocksPushedThisAttempt: 1,
    };

    expect(canCompleteLevel(blockNudge, exitOnlyState)).toBe(false);
    expect(canCompleteLevel(blockNudge, completedState)).toBe(true);
  });

  it('every spike level has meaningful hazard routing and calibrated par', () => {
    const expectedSolutionLengths = new Map([
      [11, 17],
      [12, 18],
      [15, 10],
      [24, 27],
      [29, 24],
      [30, 22],
    ]);

    const spikeLevels = LEVELS.filter((level) => level.mechanics.includes('spike'));

    expect(spikeLevels.map((level) => level.id)).toEqual([11, 12, 15, 24, 29, 30]);

    spikeLevels.forEach((level) => {
      const solutionLength = findSolutionLength(level.id);
      const solutionPositions = getSolutionPositions(level.id);
      const spikePositions = getSpikePositions(level);
      const solutionTouchesHazardPressure = solutionPositions.some((solutionPosition) =>
        spikePositions.some((spikePosition) => positionsAreAdjacent(solutionPosition, spikePosition)),
      );

      expect(solutionLength).toBe(expectedSolutionLengths.get(level.id));
      expect(level.targetMoves).toBeGreaterThanOrEqual(solutionLength ?? Number.POSITIVE_INFINITY);
      expect(level.targetMoves).toBeLessThanOrEqual((solutionLength ?? 0) + 4);
      expect(solutionTouchesHazardPressure).toBe(true);
    });
  });

  it('spike levels expose actual failed moves from reachable states', () => {
    const spikeLevels = LEVELS.filter((level) => level.mechanics.includes('spike'));

    spikeLevels.forEach((level) => {
      const initialState = createInitialGameState(level);
      const queue: GameState[] = [initialState];
      const visited = new Set([serializeState(initialState)]);
      let hasReachableSpikeFailure = false;

      while (queue.length > 0 && visited.size < 25000 && !hasReachableSpikeFailure) {
        const state = queue.shift();

        if (!state) {
          break;
        }

        for (const direction of DIRECTIONS) {
          const nextState = movePlayer(level, state, direction);

          if (nextState.isFailed) {
            hasReachableSpikeFailure = true;
            break;
          }

          const key = serializeState(nextState);

          if (!visited.has(key)) {
            visited.add(key);
            queue.push(nextState);
          }
        }
      }

      expect(hasReachableSpikeFailure).toBe(true);
    });
  });

  it('no level crashes when rendered', () => {
    LEVELS.forEach((level) => {
      const state = createInitialGameState(level);

      render(
        <GameBoard
          elapsedSeconds={0}
          gameState={state}
          hazardFlash={false}
          isHintPanelOpen={false}
          level={level}
          moves={0}
          reducedMotion={false}
          onLevelSelect={vi.fn()}
          onMove={vi.fn()}
          onPause={vi.fn()}
          onReset={vi.fn()}
          onToggleHints={vi.fn()}
          onUndo={vi.fn()}
          playerPosition={level.playerStart}
          unlockedHintCount={1}
        />,
      );

      expect(screen.getByRole('grid', { name: `${level.name} board` })).toBeInTheDocument();
      cleanup();
    });
  });
});
