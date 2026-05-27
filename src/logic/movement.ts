import type { Direction, GameState, Level, Position, TileType } from '../types/game';

const DIRECTION_OFFSETS: Record<Direction, Position> = {
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
};

const WALKABLE_TILES = new Set<TileType>(['floor', 'exit']);
const BLOCK_PUSH_TARGETS = new Set<TileType>(['floor', 'pressurePlate']);

function positionsMatch(first: Position, second: Position) {
  return first.x === second.x && first.y === second.y;
}

function positionKey(position: Position) {
  return `${position.x},${position.y}`;
}

function getTileId(level: Level, position: Position) {
  return level.tileIds?.[positionKey(position)];
}

function hasBlockAt(state: GameState, position: Position) {
  return state.pushBlocks.some((block) => positionsMatch(block, position));
}

function getInitialPushBlocks(level: Level) {
  return level.grid.flatMap((row, y) =>
    row.flatMap((tile, x) => (tile === 'pushBlock' ? [{ x, y }] : [])),
  );
}

export function getActivePressurePlateIds(level: Level, state: GameState) {
  return level.grid.flatMap((row, y) =>
    row.flatMap((tile, x) => {
      if (tile !== 'pressurePlate') {
        return [];
      }

      const position = { x, y };
      const id = getTileId(level, position);
      const isActive =
        positionsMatch(state.playerPosition, position) ||
        state.pushBlocks.some((block) => positionsMatch(block, position));

      return id && isActive ? [id] : [];
    }),
  );
}

function isLinkedDoorOpen(level: Level, state: GameState, position: Position) {
  const targetId = getTileId(level, position);
  const activeSourceIds = [...getActivePressurePlateIds(level, state), ...state.activeSwitchIds];

  return Boolean(
    targetId &&
      level.links?.some(
        (link) => link.targetId === targetId && activeSourceIds.includes(link.sourceId),
      ),
  );
}

function toggleSwitchId(activeSwitchIds: string[], switchId: string) {
  return activeSwitchIds.includes(switchId)
    ? activeSwitchIds.filter((activeSwitchId) => activeSwitchId !== switchId)
    : [...activeSwitchIds, switchId];
}

function setBlockPosition(state: GameState, from: Position, to: Position) {
  return state.pushBlocks.map((block) => (positionsMatch(block, from) ? to : block));
}

export function createInitialGameState(level: Level): GameState {
  const initialState: GameState = {
    activePressurePlateIds: [],
    activeSwitchIds: [],
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
    pushBlocks: getInitialPushBlocks(level),
  };

  return {
    ...initialState,
    activePressurePlateIds: getActivePressurePlateIds(level, initialState),
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

  if (hasBlockAt(state, position)) {
    return 'pushBlock';
  }

  if (tile === 'pushBlock') {
    return 'floor';
  }

  if (tile === 'key' && state.collectedKeyPositions.some((keyPosition) => positionsMatch(keyPosition, position))) {
    return 'floor';
  }

  if (
    tile === 'door' &&
    (state.openedDoorPositions.some((doorPosition) => positionsMatch(doorPosition, position)) ||
      isLinkedDoorOpen(level, state, position))
  ) {
    return 'floor';
  }

  return tile;
}

export function canMoveTo(level: Level, state: GameState, position: Position) {
  const tile = getEffectiveTileAt(level, state, position);

  return (
    tile !== null &&
    (WALKABLE_TILES.has(tile) ||
      tile === 'key' ||
      tile === 'pressurePlate' ||
      tile === 'switch' ||
      (tile === 'door' && (state.collectedKeys > 0 || isLinkedDoorOpen(level, state, position))))
  );
}

export function movePlayer(level: Level, state: GameState, direction: Direction): GameState {
  if (state.isComplete || state.isFailed) {
    return state;
  }

  const nextPosition = getNextPosition(state.playerPosition, direction);
  const nextTile = getEffectiveTileAt(level, state, nextPosition);

  if (nextTile === 'pushBlock') {
    const blockDestination = getNextPosition(nextPosition, direction);
    const blockDestinationTile = getEffectiveTileAt(level, state, blockDestination);
    const blockDestinationBaseTile = getTileAt(level, blockDestination);

    if (
      !blockDestinationTile ||
      !blockDestinationBaseTile ||
      !BLOCK_PUSH_TARGETS.has(blockDestinationTile) ||
      !BLOCK_PUSH_TARGETS.has(blockDestinationBaseTile)
    ) {
      return {
        ...state,
        facing: direction,
      };
    }

    const nextState = {
      ...state,
      facing: direction,
      moves: state.moves + 1,
      playerPosition: nextPosition,
      pushBlocks: setBlockPosition(state, nextPosition, blockDestination),
    };

    return {
      ...nextState,
      activePressurePlateIds: getActivePressurePlateIds(level, nextState),
    };
  }

  if (!nextTile || !canMoveTo(level, state, nextPosition)) {
    return {
      ...state,
      facing: direction,
    };
  }

  const collectsKey = nextTile === 'key';
  const opensDoor = nextTile === 'door';
  const opensLinkedDoor = opensDoor && isLinkedDoorOpen(level, state, nextPosition);
  const switchId = nextTile === 'switch' ? getTileId(level, nextPosition) : undefined;

  const nextState = {
    ...state,
    activeSwitchIds: switchId ? toggleSwitchId(state.activeSwitchIds, switchId) : state.activeSwitchIds,
    activatedSwitches: switchId
      ? state.activatedSwitches.some((switchPosition) => positionsMatch(switchPosition, nextPosition))
        ? state.activatedSwitches.filter((switchPosition) => !positionsMatch(switchPosition, nextPosition))
        : [...state.activatedSwitches, nextPosition]
      : state.activatedSwitches,
    collectedKeys: state.collectedKeys + (collectsKey ? 1 : 0) - (opensDoor && !opensLinkedDoor ? 1 : 0),
    collectedKeyPositions: collectsKey
      ? [...state.collectedKeyPositions, nextPosition]
      : state.collectedKeyPositions,
    facing: direction,
    isComplete: nextTile === 'exit',
    moves: state.moves + 1,
    openedDoorPositions: opensDoor && !opensLinkedDoor ? [...state.openedDoorPositions, nextPosition] : state.openedDoorPositions,
    playerPosition: nextPosition,
  };

  return {
    ...nextState,
    activePressurePlateIds: getActivePressurePlateIds(level, nextState),
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
