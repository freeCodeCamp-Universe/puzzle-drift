import type { Direction, GameState, Level, Position, TileType } from '../types/game';

const DIRECTION_OFFSETS: Record<Direction, Position> = {
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
};

const WALKABLE_TILES = new Set<TileType>(['floor', 'exit']);

export function createInitialGameState(level: Level): GameState {
  return {
    activatedSwitches: [],
    collectedKeys: 0,
    elapsedSeconds: 0,
    facing: 'down',
    isComplete: false,
    isFailed: false,
    levelId: level.id,
    moves: 0,
    playerPosition: { ...level.playerStart },
    pushBlocks: [],
  };
}

export function getDirectionFromKey(key: string): Direction | null {
  switch (key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      return 'up';
    case 'arrowright':
    case 'd':
      return 'right';
    case 'arrowdown':
    case 's':
      return 'down';
    case 'arrowleft':
    case 'a':
      return 'left';
    default:
      return null;
  }
}

export function getNextPosition(position: Position, direction: Direction): Position {
  const offset = DIRECTION_OFFSETS[direction];

  return {
    x: position.x + offset.x,
    y: position.y + offset.y,
  };
}

export function getTileAt(level: Level, position: Position): TileType | null {
  if (position.x < 0 || position.y < 0 || position.x >= level.width || position.y >= level.height) {
    return null;
  }

  return level.grid[position.y][position.x];
}

export function canMoveTo(level: Level, position: Position) {
  const tile = getTileAt(level, position);

  return tile !== null && WALKABLE_TILES.has(tile);
}

export function movePlayer(level: Level, state: GameState, direction: Direction): GameState {
  if (state.isComplete || state.isFailed) {
    return state;
  }

  const nextPosition = getNextPosition(state.playerPosition, direction);
  const nextTile = getTileAt(level, nextPosition);

  if (!nextTile || !canMoveTo(level, nextPosition)) {
    return {
      ...state,
      facing: direction,
    };
  }

  return {
    ...state,
    facing: direction,
    isComplete: nextTile === 'exit',
    moves: state.moves + 1,
    playerPosition: nextPosition,
  };
}

export function calculateStars(level: Level, state: GameState) {
  if (state.moves <= level.targetMoves && state.elapsedSeconds <= level.targetTimeSeconds) {
    return 3;
  }

  if (state.moves <= level.targetMoves * 1.5) {
    return 2;
  }

  return 1;
}
