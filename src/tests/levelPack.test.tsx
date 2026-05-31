import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameBoard } from '../components/GameBoard';
import { LEVELS } from '../data/levels';
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
    collectedKeyPositions: sortPositions(state.collectedKeyPositions),
    collectedKeys: state.collectedKeys,
    openedDoorPositions: sortPositions(state.openedDoorPositions),
    playerPosition: state.playerPosition,
    pushBlocks: sortPositions(state.pushBlocks),
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

function getSpikePositions(level: (typeof LEVELS)[number]) {
  return level.grid.flatMap((row, y) =>
    row.flatMap((tile, x) => (tile === 'spike' ? [{ x, y }] : [])),
  );
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
