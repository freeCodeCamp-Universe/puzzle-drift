import type { Direction, GameState, Level, Position, TileType } from '../types/game';

const DIRECTION_OFFSETS: Record<Direction, Position> = {
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
};

const WALKABLE_TILES = new Set<TileType>(['floor', 'exit']);

function positionsMatch(first: Position, second: Position) {
  return first.x === second.x && first.y === second.y;
}

export function createInitialGameState(level: Level): GameState {
  return {
    activatedSwitches: [],
    collectedKeys: 0,
    collectedKeyPositions: [],
    elapsedSeconds: 0,
    facing: 'down',
    isComplete: false,
    isFailed: false,
    levelId: level.id,
    moves: 0,
    openedDoorPositions: [],
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

export function getEffectiveTileAt(level: Level, state: GameState, position: Position): TileType | null {
  const tile = getTileAt(level, position);

  if (!tile) {
    return null;
  }

  if (tile === 'key' && state.collectedKeyPositions.some((keyPosition) => positionsMatch(keyPosition, position))) {
    return 'floor';
  }

  if (tile === 'door' && state.openedDoorPositions.some((doorPosition) => positionsMatch(doorPosition, position))) {
    return 'floor';
  }

  return tile;
}

export function canMoveTo(level: Level, state: GameState, position: Position) {
  const tile = getEffectiveTileAt(level, state, position);

  return tile !== null && (WALKABLE_TILES.has(tile) || tile === 'key' || (tile === 'door' && state.collectedKeys > 0));
}

export function movePlayer(level: Level, state: GameState, direction: Direction): GameState {
  if (state.isComplete || state.isFailed) {
    return state;
  }

  const nextPosition = getNextPosition(state.playerPosition, direction);
  const nextTile = getEffectiveTileAt(level, state, nextPosition);

  if (!nextTile || !canMoveTo(level, state, nextPosition)) {
    return {
      ...state,
      facing: direction,
    };
  }

  const collectsKey = nextTile === 'key';
  const opensDoor = nextTile === 'door';

  return {
    ...state,
    collectedKeys: state.collectedKeys + (collectsKey ? 1 : 0) - (opensDoor ? 1 : 0),
    collectedKeyPositions: collectsKey
      ? [...state.collectedKeyPositions, nextPosition]
      : state.collectedKeyPositions,
    facing: direction,
    isComplete: nextTile === 'exit',
    moves: state.moves + 1,
    openedDoorPositions: opensDoor ? [...state.openedDoorPositions, nextPosition] : state.openedDoorPositions,
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
