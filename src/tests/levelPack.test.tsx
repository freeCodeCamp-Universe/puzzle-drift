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

function findSolutionLength(levelId: number) {
  const level = LEVELS.find((candidate) => candidate.id === levelId);

  if (!level) {
    return null;
  }

  const initialState = createInitialGameState(level);
  const queue: GameState[] = [initialState];
  const visited = new Set([serializeState(initialState)]);

  while (queue.length > 0 && visited.size < 25000) {
    const state = queue.shift();

    if (!state) {
      break;
    }

    for (const direction of DIRECTIONS) {
      const nextState = movePlayer(level, state, direction);

      if (nextState.isFailed) {
        continue;
      }

      if (nextState.isComplete) {
        return nextState.moves;
      }

      const key = serializeState(nextState);

      if (!visited.has(key)) {
        visited.add(key);
        queue.push(nextState);
      }
    }
  }

  return null;
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
