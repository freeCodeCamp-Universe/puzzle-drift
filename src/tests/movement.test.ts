import { describe, expect, it } from 'vitest';
import type { Level } from '../types/game';
import { createInitialGameState, movePlayer } from '../logic/movement';

const movementLevel: Level = {
  description: 'Movement test level.',
  grid: [
    ['floor', 'floor', 'floor'],
    ['floor', 'floor', 'floor'],
    ['floor', 'floor', 'exit'],
  ],
  height: 3,
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
});
